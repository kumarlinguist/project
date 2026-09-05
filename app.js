import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp, where, getDocs, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig={apiKey:"AIzaSyAG-uz5WlLA36i3bN1c20uDYuQDNxlcsvw",authDomain:"chat2-a7562.firebaseapp.com",projectId:"chat2-a7562",storageBucket:"chat2-a7562.firebasestorage.app",messagingSenderId:"853421282645",appId:"1:853421282645:web:64b058467dcf2efae7cbdc"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const $=id=>document.getElementById(id);
let me=null,selected=null,stopUsers=null,stopMessages=null,stopTyping=null,typingTimer=null,mediaRecorder=null,audioChunks=[],replyTo=null,editingId=null;
const chatId=(a,b)=>[a,b].sort().join("_");
const currentChatId=()=>selected?.isGroup?`group_${selected.uid}`:chatId(me.uid,selected.uid);
const initials=n=>(n||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
const normalizeMobile=v=>String(v||"").replace(/\D/g,"");
const normalizeEmail=v=>String(v||"").trim().toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fmt(ts){return ts?.toDate?ts.toDate().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):""}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2600)}
function err(msg){$("authError").textContent=msg||""}
function friendlyError(e){const m={"auth/invalid-credential":"Incorrect email or password.","auth/invalid-email":"Please enter a valid email address.","auth/user-not-found":"No account was found with this email.","auth/wrong-password":"Incorrect password.","auth/email-already-in-use":"This email is already registered.","auth/weak-password":"Password must be at least 6 characters.","auth/too-many-requests":"Too many attempts. Please wait a moment.","auth/network-request-failed":"Network error. Check your internet connection."};return m[e?.code]||e?.message||"Something went wrong. Please try again."}
function setOnline(uid,online){return setDoc(doc(db,"users",uid),{online,lastSeen:serverTimestamp()},{merge:true})}
function formatLastSeen(u){if(u?.online)return "Online";if(u?.lastSeen?.toDate)return "Last seen "+u.lastSeen.toDate().toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});return "Offline"}

const loginForm=$("loginForm"),signupForm=$("signupForm");
function setAuthMode(mode){const login=mode==="login";$("loginTab").classList.toggle("active",login);$("signupTab").classList.toggle("active",!login);loginForm.classList.toggle("hidden",!login);signupForm.classList.toggle("hidden",login);err("");$("authEyebrow").textContent=login?"WELCOME BACK":"GET STARTED";$("authTitle").textContent=login?"Sign in to Chat2":"Create your Chat2 account";$("authSubtitle").textContent=login?"Continue your conversations securely.":"Connect with people and start chatting in real time."}
$("loginTab").onclick=()=>setAuthMode("login");$("signupTab").onclick=()=>setAuthMode("signup");
$("togglePassword").onclick=()=>{const i=$("password"),show=i.type==="password";i.type=show?"text":"password";$("togglePassword").textContent=show?"Hide":"Show"};
loginForm.onsubmit=async e=>{e.preventDefault();try{err("");await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(e){err(friendlyError(e))}};
signupForm.onsubmit=async e=>{e.preventDefault();try{err("");const name=$("displayName").value.trim()||"User",email=normalizeEmail($("signupEmail").value),password=$("signupPassword").value,mobile=normalizeMobile($("mobileNumber").value);if(mobile.length<10)throw new Error("Please enter a valid mobile number.");if(!(await getDocs(query(collection(db,"users"),where("mobile","==",mobile),limit(1)))).empty)throw new Error("This mobile number is already linked to an account.");const c=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(c.user,{displayName:name});await setDoc(doc(db,"users",c.user.uid),{uid:c.user.uid,name,email:c.user.email,mobile,normalizedEmail:email,createdAt:serverTimestamp(),online:true})}catch(e){err(friendlyError(e))}};
$("forgotBtn").onclick=async()=>{const email=$("email").value.trim();if(!email)return err("Enter your email address first.");try{await sendPasswordResetEmail(auth,email);err("Password reset email sent. Check your inbox.")}catch(e){err(friendlyError(e))}};
$("logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,async user=>{if(!user){me=null;selected=null;$("authView").classList.remove("hidden");$("appView").classList.add("hidden");return}me=user;await setOnline(user.uid,true);window.addEventListener("beforeunload",()=>setOnline(user.uid,false));$("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("meName").textContent=user.displayName||"User";$("meEmail").textContent=user.email;setAvatar($("meAvatar"),user.displayName,user.photoURL);const u=doc(db,"users",user.uid);if(!(await getDoc(u)).exists())await setDoc(u,{uid:user.uid,name:user.displayName||"User",email:user.email,createdAt:serverTimestamp()},{merge:true});watchUsers();watchGroups()});


// WhatsApp-style personal profile
let myProfileData={about:"Hey there! I am using Chat2.",photoURL:"",notifications:true,showOnline:true};
const profilePrefsKey=()=>`chat2-profile-prefs-${me?.uid||"guest"}`;
function loadProfilePrefs(){try{return JSON.parse(localStorage.getItem(profilePrefsKey())||"{}")}catch{return {}}}
function avatarMarkup(name,url,cls="avatar"){return url?`<img class="${cls} avatar-photo" src="${esc(url)}" alt="">`:null}
function setAvatar(el,name,url){if(!el)return;if(url){el.innerHTML=`<img src="${esc(url)}" alt="" class="avatar-photo">`}else el.textContent=initials(name)}
async function openMyProfile(){
  if(!me)return;
  const snap=await getDoc(doc(db,"users",me.uid));
  const u=snap.exists()?snap.data():{};
  const lp=loadProfilePrefs();
  myProfileData={about:u.about||"Hey there! I am using Chat2.",photoURL:u.photoURL||me.photoURL||"",mobile:u.mobile||"",notifications:lp.notifications!==false,showOnline:lp.showOnline!==false};
  $("profileHeroName").textContent=u.name||me.displayName||"User";
  $("profileHeroAbout").textContent=myProfileData.about;
  $("profileNameInput").value=u.name||me.displayName||"User";
  $("profileAboutInput").value=myProfileData.about;
  $("profileMobileText").textContent=u.mobile||"Not added";
  $("profileEmailText").textContent=me.email||u.email||"—";
  setAvatar($("myProfileAvatar"),u.name||me.displayName,myProfileData.photoURL);
  setAvatar($("meAvatar"),u.name||me.displayName,myProfileData.photoURL);
  $("profileNotifications").checked=myProfileData.notifications;
  $("profileOnlineStatus").checked=myProfileData.showOnline;
  $("profileDarkMode").checked=document.body.classList.contains("dark");
  $("myProfileModal").classList.remove("hidden");
}
async function saveMyProfile(){
  try{
    const name=$("profileNameInput").value.trim()||"User", about=$("profileAboutInput").value.trim()||"Hey there! I am using Chat2.";
    const prefs={notifications:$("profileNotifications").checked,showOnline:$("profileOnlineStatus").checked};
    await updateProfile(me,{displayName:name,photoURL:myProfileData.photoURL||null});
    await setDoc(doc(db,"users",me.uid),{uid:me.uid,name,email:me.email,mobile:myProfileData.mobile||undefined,about,photoURL:myProfileData.photoURL||"",online:prefs.showOnline?true:false,updatedAt:serverTimestamp()},{merge:true});
    localStorage.setItem(profilePrefsKey(),JSON.stringify(prefs));
    if(prefs.showOnline)await setOnline(me.uid,true);else await setDoc(doc(db,"users",me.uid),{online:false,lastSeen:serverTimestamp()},{merge:true});
    $("meName").textContent=name;setAvatar($("meAvatar"),name,myProfileData.photoURL);$("profileHeroName").textContent=name;$("profileHeroAbout").textContent=about;
    document.body.classList.toggle("dark",$("profileDarkMode").checked);localStorage.setItem("chat2-theme",$("profileDarkMode").checked?"dark":"light");
    $("myProfileModal").classList.add("hidden");toast("Profile updated");watchUsers();
  }catch(e){console.error(e);$("profileSaveError").textContent=friendlyError(e)}
}
$("myProfileCard").onclick=openMyProfile;
$("closeMyProfile").onclick=()=>$("myProfileModal").classList.add("hidden");
["editProfileName","editProfileAbout"].forEach(id=>$(id).onclick=()=>{const target=id.endsWith("Name")?$("profileNameInput"):$("profileAboutInput");target.focus();target.select()});
$("profilePhotoInput").onchange=async e=>{const file=e.target.files[0];if(!file||!me)return;if(!file.type.startsWith("image/"))return toast("Choose an image file");if(file.size>10*1024*1024)return toast("Profile photo must be under 10 MB");try{const r=ref(storage,`profilePhotos/${me.uid}/avatar`);const task=uploadBytesResumable(r,file,{contentType:file.type});await new Promise((resolve,reject)=>task.on("state_changed",null,reject,resolve));myProfileData.photoURL=await getDownloadURL(r);setAvatar($("myProfileAvatar"),$("profileNameInput").value,myProfileData.photoURL);toast("Profile photo ready — save profile")}catch(e){toast("Photo upload failed. Check Firebase Storage rules.")}e.target.value=""};
$("profileDarkMode").onchange=e=>{document.body.classList.toggle("dark",e.target.checked)};
$("saveMyProfile").onclick=saveMyProfile;

let groupCache=[];
function watchGroups(){onSnapshot(query(collection(db,"groups"),where("memberIds","array-contains",me.uid),orderBy("createdAt","desc"),limit(50)),snap=>{groupCache=snap.docs.map(d=>({uid:d.id,...d.data(),isGroup:true}));renderGroups();},()=>{});}
function renderGroups(){const list=$("userList");if(!list)return;document.querySelectorAll(".group-row").forEach(x=>x.remove());groupCache.forEach(g=>{const el=document.createElement("div");el.className="user group-row"+(selected?.uid===g.uid?" active":"");el.innerHTML=`<div class="avatar">👥</div><div class="meta"><b>${esc(g.name||"Group")}</b><small>${(g.memberIds||[]).length} members</small></div>`;el.onclick=()=>openGroup(g);list.prepend(el);});}
async function openGroup(g){selected=g;replyTo=null;editingId=null;$("chatName").textContent=g.name||"Group";$("chatAvatar").textContent="👥";$("chatStatus").textContent=`${(g.memberIds||[]).length} members`;$("typingStatus").textContent="";$("messageInput").disabled=false;$("sendBtn").disabled=false;$("chatActions").classList.remove("hidden");watchMessages();}
function openGroupModal(){const box=$("groupMembers");box.innerHTML="";const users=[...document.querySelectorAll(".user")].map(()=>null);getDocs(query(collection(db,"users"),orderBy("name"),limit(100))).then(snap=>snap.forEach(d=>{const u=d.data();if(u.uid===me.uid)return;const row=document.createElement("label");row.className="member-row";row.innerHTML=`<input type="checkbox" value="${esc(u.uid)}"><div class="avatar">${esc(initials(u.name))}</div><span>${esc(u.name||u.email||"User")}</span>`;box.appendChild(row)}));$("groupModal").classList.remove("hidden");}
$("newGroupBtn").onclick=openGroupModal;$("closeGroup").onclick=()=>$("groupModal").classList.add("hidden");$("createGroup").onclick=async()=>{const name=$("groupName").value.trim()||"New group";const ids=[...$("groupMembers").querySelectorAll("input:checked")].map(x=>x.value);if(!ids.length)return toast("Select at least one member");ids.push(me.uid);const r=await addDoc(collection(db,"groups"),{name,memberIds:[...new Set(ids)],createdBy:me.uid,createdAt:serverTimestamp()});$("groupModal").classList.add("hidden");$("groupName").value="";toast("Group created");openGroup({uid:r.id,name,memberIds:[...new Set(ids)],isGroup:true});};

function watchUsers(){
  stopUsers?.();
  stopUsers=onSnapshot(query(collection(db,"users"),orderBy("name")),snap=>{
    const term=$("userSearch").value.trim().toLowerCase(),list=$("userList");
    list.innerHTML="";
    const p=prefs();
    // A person must appear only once. Some older databases may contain duplicate
    // profile documents, so we compare UID, normalized email AND normalized mobile.
    const seenUids=new Set(), seenEmails=new Set(), seenMobiles=new Set();
    const users=[];
    snap.forEach(d=>{
      const u={uid:d.id,...d.data()};
      const uid=String(u.uid||d.id);
      const email=normalizeEmail(u.email||"");
      const mobile=normalizeMobile(u.mobile||"");
      if(uid===me.uid) return;
      const duplicate=seenUids.has(uid)||(email&&seenEmails.has(email))||(mobile&&seenMobiles.has(mobile));
      if(duplicate) return;
      const searchable=`${u.name||""} ${u.email||""} ${u.mobile||""}`.toLowerCase();
      if(term&&!searchable.includes(term)) return;
      seenUids.add(uid); if(email)seenEmails.add(email); if(mobile)seenMobiles.add(mobile);
      users.push(u);
    });
    // Keep one stable row per account and sort by name.
    users.sort((a,b)=>String(a.name||a.email||"").localeCompare(String(b.name||b.email||"")));
    users.forEach(u=>{
      const el=document.createElement("div");
      el.className="user"+(selected?.uid===u.uid?" active":"");
      el.dataset.identity=`u:${u.uid}`;
      el.innerHTML=`<div class="avatar-wrap"><div class="avatar">${esc(initials(u.name))}</div><i class="online-dot ${u.online?"on":""}"></i></div><div class="meta"><b>${esc(u.name||"User")}</b><small>${esc(u.mobile||u.email||"")}</small></div><button class="more-user" title="Options">⋮</button>`;
      el.onclick=e=>{if(e.target.closest(".more-user")){showUserMenu(u,el);return}openChat(u)};
      if(!p.archived.includes(`u:${u.uid}`)) list.appendChild(el);
      if(p.pinned.includes(`u:${u.uid}`)) el.classList.add("pinned");
    });
  });
}
$("userSearch").oninput=watchUsers;
function showUserMenu(u,el){const ok=confirm(`Chat with ${u.name||"this user"}?\n\nOK = open chat\nCancel = close`);if(ok)openChat(u)}

async function openChat(u){selected=u;replyTo=null;editingId=null;$("chatName").textContent=u.name||"User";$("chatAvatar").textContent=initials(u.name);$("chatStatus").textContent=formatLastSeen(u);$("typingStatus").textContent="";$("messageInput").disabled=false;$("sendBtn").disabled=false;$("chatActions").classList.remove("hidden");watchMessages()}
function watchMessages(){stopMessages?.();$("messages").innerHTML="";const q=query(collection(db,"chats",currentChatId(),"messages"),orderBy("createdAt","asc"),limit(300));watchTyping();stopMessages=onSnapshot(q,snap=>{$("messages").innerHTML="";if(snap.empty){$("messages").innerHTML='<div class="empty"><div class="empty-icon">👋</div><p>Say hello!</p></div>';return}snap.forEach(d=>renderMessage(d.id,d.data()));$("messages").scrollTop=$("messages").scrollHeight;markMessagesRead(snap)})}
function renderMessage(id,m){const b=document.createElement("div");b.className="bubble"+(m.senderId===me.uid?" mine":"");b.dataset.id=id;let body="";if(m.replyText)body+=`<div class="reply-preview"><b>${m.replySender===me.uid?"You":esc(selected.name)}</b><span>${esc(m.replyText)}</span></div>`;if(m.type==="text")body+=`<div class="msg-text">${esc(m.text).replace(/\n/g,"<br>")}</div>`;else if(m.type==="image")body+=`<img src="${esc(m.url)}" alt="Photo" loading="lazy">`;else if(m.type==="video")body+=`<video src="${esc(m.url)}" controls preload="metadata"></video>`;else if(m.type==="audio")body+=`<audio src="${esc(m.url)}" controls></audio>`;else body+=`<a class="file-card" href="${esc(m.url)}" target="_blank" rel="noopener">📎 ${esc(m.name||"File")}</a>`;const reactions=m.reactions||{};const reactionHtml=Object.entries(reactions).map(([emoji,count])=>`<button class="reaction" data-react="${esc(emoji)}">${esc(emoji)} ${count}</button>`).join("");b.innerHTML=body+`<div class="message-meta"><span>${fmt(m.createdAt)}${m.edited?" · edited":""}</span>${m.senderId===me.uid?`<span class="read-state">${m.read?"✓✓":"✓"}</span>`:""}</div><div class="message-actions"><button data-action="reply">↩</button><button data-action="react">😊</button>${m.senderId===me.uid&&m.type==="text"?`<button data-action="edit">Edit</button>`:""}<button data-action="forward">↗</button>${m.senderId===me.uid?`<button data-action="delete">Delete</button>`:""}</div><div class="reactions">${reactionHtml}</div>`;
 b.querySelectorAll("[data-action]").forEach(btn=>btn.onclick=()=>messageAction(btn.dataset.action,id,m));b.querySelectorAll("[data-react]").forEach(btn=>btn.onclick=()=>reactToMessage(id,btn.dataset.react));$("messages").appendChild(b)}
async function markMessagesRead(snap){for(const d of snap.docs){const m=d.data();if(m.receiverId===me.uid&&!m.read)updateDoc(d.ref,{read:true,readAt:serverTimestamp()}).catch(()=>{})}}
async function deleteMessage(id){if(!selected||!confirm("Delete this message for everyone?"))return;try{await deleteDoc(doc(db,"chats",currentChatId(),"messages",id));toast("Message deleted")}catch(e){toast("Could not delete message")}}
async function editMessage(id,m){const next=prompt("Edit message:",m.text);if(next===null)return;if(!next.trim())return toast("Message cannot be empty");await updateDoc(doc(db,"chats",currentChatId(),"messages",id),{text:next.trim(),edited:true,editedAt:serverTimestamp()});toast("Message edited")}
function messageAction(action,id,m){if(action==="reply"){replyTo={id,text:m.text||m.name||m.type,senderId:m.senderId};$("replyBar").classList.remove("hidden");$("replyText").textContent=replyTo.text;$("messageInput").focus()}else if(action==="edit")editMessage(id,m);else if(action==="delete")deleteMessage(id);else if(action==="react")reactToMessage(id,"❤️");else if(action==="forward"){const text=m.text||`[${m.type}]`;$("messageInput").value=`↗ ${text}`;$("messageInput").focus();toast("Edit the forwarded text before sending")}}
async function reactToMessage(id,emoji){const r=doc(db,"chats",currentChatId(),"messages",id),s=await getDoc(r),data=s.data()||{},reactions={...(data.reactions||{})};reactions[emoji]=(reactions[emoji]||0)+1;await updateDoc(r,{reactions});}

async function sendText(){if(!selected)return;const input=$("messageInput"),text=input.value.trim();if(!text)return;const data={senderId:me.uid,receiverId:selected.isGroup?null:selected.uid,type:"text",text,read:false,createdAt:serverTimestamp(),senderName:me.displayName||"User"};if(replyTo){data.replyId=replyTo.id;data.replyText=replyTo.text;data.replySender=replyTo.senderId}if(editingId){await updateDoc(doc(db,"chats",currentChatId(),"messages",editingId),{text,edited:true,editedAt:serverTimestamp()});editingId=null}else await addDoc(collection(db,"chats",currentChatId(),"messages"),data);input.value="";cancelReply()}
$("sendBtn").onclick=sendText;$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText()}});$("messageInput").addEventListener("input",()=>{const x=$("messageInput");x.style.height="auto";x.style.height=Math.min(x.scrollHeight,120)+"px";sendTyping(true);clearTimeout(typingTimer);typingTimer=setTimeout(()=>sendTyping(false),1200)});
async function sendTyping(value){if(!selected||!me)return;await setDoc(doc(db,"chats",currentChatId(),"typing",me.uid),{typing:value,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{})}
function watchTyping(){stopTyping?.();if(!selected)return;stopTyping=onSnapshot(doc(db,"chats",currentChatId(),"typing",selected.uid),d=>{$("typingStatus").textContent=d.data()?.typing?"typing…":""})}
function cancelReply(){$("replyBar").classList.add("hidden");replyTo=null}
$("cancelReply").onclick=cancelReply;

const emojis=["😀","😂","😍","😎","😭","😡","👍","👎","❤️","🔥","🎉","👏","🙏","💯","🤔","🤣","😊","🥳","😴","😮","❤️‍🔥","✨","🚀","💬"];
$("emojiBtn").onclick=()=>{const p=$("emojiPicker");p.classList.toggle("hidden");if(!p.innerHTML)p.innerHTML=emojis.map(e=>`<button type="button">${e}</button>`).join("");p.querySelectorAll("button").forEach(b=>b.onclick=()=>{$("messageInput").value+=b.textContent;$("messageInput").focus();p.classList.add("hidden")})};
$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("chat2-theme",document.body.classList.contains("dark")?"dark":"light")};if(localStorage.getItem("chat2-theme")==="dark")document.body.classList.add("dark");
$("attachBtn").onclick=()=>{if(selected)$("fileInput").click()};
$("recordBtn").onclick=async()=>{if(!selected)return toast("Select a person first");if(mediaRecorder?.state==="recording"){mediaRecorder.stop();$("recordBtn").textContent="🎙";return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});audioChunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);mediaRecorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());await uploadMedia(new File([new Blob(audioChunks,{type:"audio/webm"})],`voice-${Date.now()}.webm`,{type:"audio/webm"}))};mediaRecorder.start();$("recordBtn").textContent="⏹";toast("Recording… click again to stop")}catch(e){toast("Microphone permission was denied")}};
async function uploadMedia(file){
  if(!selected||!me)return toast("Select a chat first");
  if(!file||!file.size)return toast("The selected file is empty");
  const max=100*1024*1024;
  if(file.size>max)return toast("Maximum file size is 100 MB");
  const mime=file.type||guessMime(file.name);
  const type=mime.startsWith("audio/")?"audio":mime.startsWith("image/")?"image":mime.startsWith("video/")?"video":"file";
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
  const path=`chatMedia/${currentChatId()}/${Date.now()}_${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}_${safe}`;
  const storageRef=ref(storage,path);
  const metadata={contentType:mime,customMetadata:{senderId:me.uid,chatId:currentChatId(),originalName:file.name}};
  const progress=$("uploadProgress"),bar=progress.querySelector("span"),label=progress.querySelector("b");
  progress.classList.remove("hidden");bar.style.width="0%";label.textContent=`Uploading ${file.name}…`;
  try{
    const task=uploadBytesResumable(storageRef,file,metadata);
    const snapshot=await new Promise((resolve,reject)=>{
      task.on("state_changed",s=>{bar.style.width=((s.bytesTransferred/s.totalBytes)*100).toFixed(0)+"%"},reject,()=>resolve(task.snapshot));
    });
    const url=await getDownloadURL(snapshot.ref);
    await addDoc(collection(db,"chats",currentChatId(),"messages"),{
      senderId:me.uid,receiverId:selected.isGroup?null:selected.uid,type,url,name:file.name,size:file.size,mime,read:false,createdAt:serverTimestamp(),senderName:me.displayName||"User"
    });
    toast(type==="image"?"Photo sent":type==="video"?"Video sent":type==="audio"?"Audio sent":"File sent");
  }catch(e){
    console.error("Chat2 media upload error",e);
    const code=e?.code||"";
    if(code.includes("storage/unauthorized"))toast("Upload blocked. Publish Firebase Storage rules.");
    else if(code.includes("storage/unauthenticated"))toast("Please sign in again before uploading.");
    else if(code.includes("storage/unknown"))toast("Firebase Storage is not enabled or configured correctly.");
    else toast(`Upload failed: ${e?.message||"check Firebase Storage"}`);
  }finally{progress.classList.add("hidden");bar.style.width="0%";}
}
function guessMime(name){
  const ext=(name.split(".").pop()||"").toLowerCase();
  return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",pdf:"application/pdf",txt:"text/plain",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",zip:"application/zip",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"})[ext]||"application/octet-stream";
}
$("fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!selected){toast("Select a chat first");e.target.value="";return}await uploadMedia(f);e.target.value=""};

$("profileBtn").onclick=()=>{$("profilePanel").classList.toggle("hidden")};$("closeProfile").onclick=()=>$("profilePanel").classList.add("hidden");
$("searchInChat").onclick=()=>{const q=prompt("Search messages in this chat:");if(!q||!selected)return;document.querySelectorAll(".bubble").forEach(b=>b.classList.toggle("highlight",b.textContent.toLowerCase().includes(q.toLowerCase())))};
$("clearChat").onclick=async()=>{if(!selected||!confirm("Delete your chat messages? This removes messages from the shared chat."))return;const qs=await getDocs(query(collection(db,"chats",currentChatId(),"messages"),limit(300)));for(const d of qs.docs)await deleteDoc(d.ref);toast("Chat cleared")};


// Pinned and archived chats (stored locally per account for a fast, private UI preference).
const prefKey=()=>`chat2-prefs-${me?.uid||"guest"}`;
function prefs(){try{return JSON.parse(localStorage.getItem(prefKey())||'{"pinned":[],"archived":[]}')}catch{return {pinned:[],archived:[]}}}
function savePrefs(x){localStorage.setItem(prefKey(),JSON.stringify(x));watchUsers();renderGroups()}
$("pinChatBtn").onclick=()=>{if(!selected||selected.isGroup===undefined)return;const x=prefs(),id=selected.isGroup?`g:${selected.uid}`:`u:${selected.uid}`;x.pinned=x.pinned.includes(id)?x.pinned.filter(v=>v!==id):[...x.pinned,id];savePrefs(x);toast(x.pinned.includes(id)?"Chat pinned":"Chat unpinned")};
$("archiveChatBtn").onclick=()=>{if(!selected)return;const x=prefs(),id=selected.isGroup?`g:${selected.uid}`:`u:${selected.uid}`;x.archived=x.archived.includes(id)?x.archived.filter(v=>v!==id):[...x.archived,id];savePrefs(x);toast(x.archived.includes(id)?"Chat archived":"Chat restored")};
$("showPinnedBtn").onclick=()=>{const x=prefs();document.querySelectorAll(".user").forEach(el=>{const b=el.querySelector("b"),match=[...x.pinned].some(id=>b&&el.dataset.identity===id);el.style.display=match?"flex":"none"});toast("Showing pinned chats")};
if("Notification" in window&&Notification.permission==="default")Notification.requestPermission().catch(()=>{});
