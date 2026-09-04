import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp, where, getDocs, updateDoc, limit } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig={apiKey:"AIzaSyAG-uz5WlLA36i3bN1c20uDYuQDNxlcsvw",authDomain:"chat2-a7562.firebaseapp.com",projectId:"chat2-a7562",storageBucket:"chat2-a7562.firebasestorage.app",messagingSenderId:"853421282645",appId:"1:853421282645:web:64b058467dcf2efae7cbdc"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);

const $=id=>document.getElementById(id);
let me=null, selected=null, stopUsers=null, stopMessages=null;
const chatId=(a,b)=>[a,b].sort().join("_");
const initials=n=>(n||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function err(msg){$("authError").textContent=msg}
function fmt(ts){if(!ts?.toDate)return "";return ts.toDate().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}

$("loginBtn").onclick=async()=>{try{err("");await signInWithEmailAndPassword(auth,$("email").value,$("password").value)}catch(e){err(e.message)}};
$("signupBtn").onclick=async()=>{try{err("");const name=$("displayName").value.trim()||"User";const c=await createUserWithEmailAndPassword(auth,$("email").value,$("password").value);await updateProfile(c.user,{displayName:name});await setDoc(doc(db,"users",c.user.uid),{uid:c.user.uid,name,email:c.user.email,createdAt:serverTimestamp()})}catch(e){err(e.message)}};
$("logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,async user=>{
  if(!user){$("authView").classList.remove("hidden");$("appView").classList.add("hidden");return}
  me=user;$("authView").classList.add("hidden");$("appView").classList.remove("hidden");
  $("meName").textContent=user.displayName||"User";$("meEmail").textContent=user.email;$("meAvatar").textContent=initials(user.displayName);
  const u=doc(db,"users",user.uid);if(!(await getDoc(u)).exists())await setDoc(u,{uid:user.uid,name:user.displayName||"User",email:user.email,createdAt:serverTimestamp()},{merge:true});
  watchUsers();
});

function watchUsers(){
  stopUsers?.();stopUsers=onSnapshot(collection(db,"users"), snap => {
    const term=$("userSearch").value.toLowerCase();const list=$("userList");list.innerHTML="";
    snap.forEach(d=>{const u=d.data();if(u.uid===me.uid||!(`${u.name} ${u.email}`.toLowerCase().includes(term)))return;
      const el=document.createElement("div");el.className="user"+(selected?.uid===u.uid?" active":"");el.innerHTML=`<div class="avatar">${esc(initials(u.name))}</div><div class="meta"><b>${esc(u.name||"User")}</b><small>${esc(u.email||"")}</small></div>`;el.onclick=()=>openChat(u);list.appendChild(el);
    });
  });
}
$("userSearch").oninput=watchUsers;

async function openChat(u){
  selected=u;$("chatName").textContent=u.name||"User";$("chatStatus").textContent=u.email||"";
  $("messageInput").disabled=false;$("sendBtn").disabled=false;watchMessages();
}
function watchMessages(){
  stopMessages?.();$("messages").innerHTML="";
  const q=query(collection(db,"chats",chatId(me.uid,selected.uid),"messages"),orderBy("createdAt","asc"),limit(300));
  stopMessages=onSnapshot(q,snap=>{
    $("messages").innerHTML="";
    if(snap.empty){$("messages").innerHTML='<div class="empty"><div class="empty-icon">👋</div><p>Say hello!</p></div>';return}
    snap.forEach(d=>renderMessage(d.data()));
    $("messages").scrollTop=$("messages").scrollHeight;
  });
}
function renderMessage(m){
  const b=document.createElement("div");b.className="bubble"+(m.senderId===me.uid?" mine":"");
  let body="";
  if(m.type==="text")body=`<div>${esc(m.text).replace(/\n/g,"<br>")}</div>`;
  else if(m.type==="image")body=`<img src="${esc(m.url)}" alt="Photo" loading="lazy">`;
  else if(m.type==="video")body=`<video src="${esc(m.url)}" controls preload="metadata"></video>`;
  else if(m.type==="audio")body=`<audio src="${esc(m.url)}" controls></audio>`;
  else body=`<a class="file-card" href="${esc(m.url)}" target="_blank" rel="noopener">📎 ${esc(m.name||"File")}</a>`;
  b.innerHTML=body+`<span class="time">${fmt(m.createdAt)}</span>`;$("messages").appendChild(b);
}

async function sendText(){
  if(!selected)return;const input=$("messageInput"),text=input.value.trim();if(!text)return;
  input.value="";await addDoc(collection(db,"chats",chatId(me.uid,selected.uid),"messages"),{senderId:me.uid,receiverId:selected.uid,type:"text",text,createdAt:serverTimestamp()});
}
$("sendBtn").onclick=sendText;$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText()}});
$("messageInput").addEventListener("input",()=>{const x=$("messageInput");x.style.height="auto";x.style.height=Math.min(x.scrollHeight,120)+"px"});

$("attachBtn").onclick=()=>{if(selected)$("fileInput").click()};
$("fileInput").onchange=async e=>{
  const file=e.target.files[0];if(!file||!selected)return;
  const allowed=20*1024*1024;if(file.size>allowed){alert("This demo limits uploads to 20 MB.");e.target.value="";return}
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`chatMedia/${chatId(me.uid,selected.uid)}/${Date.now()}_${safe}`;
  const task=uploadBytesResumable(ref(storage,path),file);$("uploadProgress").classList.remove("hidden");
  task.on("state_changed",s=>{$("uploadProgress").querySelector("span").style.width=(s.bytesTransferred/s.totalBytes*100)+"%"},console.error,async()=>{
    const url=await getDownloadURL(task.snapshot.ref);let type="file";if(file.type.startsWith("image/"))type="image";else if(file.type.startsWith("video/"))type="video";else if(file.type.startsWith("audio/"))type="audio";
    await addDoc(collection(db,"chats",chatId(me.uid,selected.uid),"messages"),{senderId:me.uid,receiverId:selected.uid,type,url,name:file.name,size:file.size,mime:file.type,createdAt:serverTimestamp()});
    $("uploadProgress").classList.add("hidden");$("fileInput").value="";
  });
};
