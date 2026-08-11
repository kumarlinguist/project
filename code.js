// ---- CONFIG: swap this for your real wordmark / tagline ----
// Even word count splits evenly; odd counts put the extra word on the left group.
const WORDS = ["AKH", "TAR"];
const italicIndices = []; // e.g. [1] to italicize the 2nd word

const groupLeft = document.getElementById('groupLeft');
const groupRight = document.getElementById('groupRight');
const gap = document.getElementById('gap');
const line = document.getElementById('line');
const imageSlot = document.getElementById('imageSlot');
const images = imageSlot.querySelectorAll('img');
const hero = document.getElementById('hero');
const heroSpan = hero.querySelector('h1 span');
const stage = document.getElementById('stage');
const curtainLeft = document.getElementById('curtainLeft');
const curtainRight = document.getElementById('curtainRight');

const mid = Math.ceil(WORDS.length / 2);
const leftWords = WORDS.slice(0, mid);
const rightWords = WORDS.slice(mid);

function buildWords(container, words, offset){
  container.innerHTML = '';
  words.forEach((w, i) => {
    const el = document.createElement('span');
    el.className = 'word' + (italicIndices.includes(offset+i) ? ' italic' : '');
    // split into individual characters, each its own masked span —
    // mirrors SplitText's splitType="chars" behavior
    [...w].forEach(ch => {
      const charWrap = document.createElement('span');
      charWrap.className = 'char';
      const inner = document.createElement('span');
      inner.textContent = ch;
      charWrap.appendChild(inner);
      el.appendChild(charWrap);
    });
    container.appendChild(el);
  });
}
buildWords(groupLeft, leftWords, 0);
buildWords(groupRight, rightWords, mid);

const allCharSpans = () => document.querySelectorAll('.char span');
const easeOut = 'cubic-bezier(0.16, 1, 0.3, 1)';
const easeInOut = 'cubic-bezier(0.76, 0, 0.24, 1)';

let slideshowTimer = null;
let currentImg = 0;

// Instant hard-cut slideshow — no wipe, no blur, no fade.
// Runs a fixed number of quick cuts, then holds the final image longer before closing.
function playSlideshow(onDone){
  const fastMs = 220;      // quick hard-cut interval
  const totalCuts = images.length * 2; // cycle through twice for a punchy rhythm
  let cutsLeft = totalCuts;

  function cut(){
    const next = (currentImg + 1) % images.length;
    images[currentImg].style.opacity = 0;
    images[currentImg].classList.remove('active');
    images[next].style.opacity = 1;
    images[next].classList.add('active');
    currentImg = next;
    cutsLeft--;

    if (cutsLeft > 0){
      slideshowTimer = setTimeout(cut, fastMs);
    } else {
      // final image holds — slow, settled beat before the close animation starts
      slideshowTimer = setTimeout(onDone, 900);
    }
  }
  slideshowTimer = setTimeout(cut, fastMs);
}

function stopSlideshow(){
  clearTimeout(slideshowTimer);
}

function run(){
  stopSlideshow();
  currentImg = 0;
  images.forEach((img,i) => {
    img.style.opacity = i===0 ? 1 : 0;
    img.classList.toggle('active', i===0);
  });
  gap.style.width = '0px';
  imageSlot.style.clipPath = 'inset(50% 0 50% 0)';

  const spans = allCharSpans();
  spans.forEach(s => s.style.transform = 'translateY(115%)');

  // 1. slide up from bottom, per-character, staggered left to right — like SplitText splitType="chars"
  spans.forEach((s, i) => {
    s.animate(
      [{ transform:'translateY(115%)' }, { transform:'translateY(0%)' }],
      { duration:750, delay: 80 + i*45, easing: easeOut, fill:'forwards' }
    );
  });

  const entranceEnd = 80 + spans.length*45 + 750;

  // 2. hold briefly, then split — animate gap width open
  setTimeout(() => {
    gap.animate(
      [{ width:'0px' }, { width: 'min(30vw, 340px)' }],
      { duration:900, easing: easeInOut, fill:'forwards' }
    ).onfinish = () => { gap.style.width = 'min(30vw, 340px)'; };
  }, entranceEnd + 350);

  // 3. image reveals as horizontal blinds open (clip-path), slightly after split starts
  setTimeout(() => {
    imageSlot.animate(
      [{ clipPath:'inset(50% 0 50% 0)' }, { clipPath:'inset(0% 0 0% 0)' }],
      { duration:750, easing: easeInOut, fill:'forwards' }
    ).onfinish = () => { imageSlot.style.clipPath = 'inset(0% 0 0% 0)'; };
  }, entranceEnd + 550);

  // 4. slideshow begins once image is fully open, then auto-closes when done
  setTimeout(() => {
    playSlideshow(() => reverse());
  }, entranceEnd + 1450);
}

function reverse(){
  stopSlideshow();

  // 1. image closes (blinds shut)
  imageSlot.animate(
    [{ clipPath:'inset(0% 0 0% 0)' }, { clipPath:'inset(50% 0 50% 0)' }],
    { duration:700, easing: easeInOut, fill:'forwards' }
  ).onfinish = () => { imageSlot.style.clipPath = 'inset(50% 0 50% 0)'; };

  // 2. groups move back together — gap fully collapses, SHAH and ZAIB sit flush
  setTimeout(() => {
    gap.animate(
      [{ width: gap.getBoundingClientRect().width + 'px' }, { width:'0px' }],
      { duration:750, easing: easeInOut, fill:'forwards' }
    ).onfinish = () => { gap.style.width = '0px'; };
  }, 350);

  // 3. once reconnected, curtains sweep in from center to cover the stage,
  // then the stage is swapped out and curtains wipe apart to reveal the
  // hero underneath — a proper curtain transition, not a fade.
  setTimeout(() => {
    curtainLeft.animate(
      [{ transform:'translateX(-100%)' }, { transform:'translateX(0%)' }],
      { duration:550, easing: easeInOut, fill:'forwards' }
    );
    curtainRight.animate(
      [{ transform:'translateX(100%)' }, { transform:'translateX(0%)' }],
      { duration:550, easing: easeInOut, fill:'forwards' }
    ).onfinish = () => {
      // curtains now fully cover the screen — swap stage for hero behind them
      stage.style.display = 'none';

      curtainLeft.animate(
        [{ transform:'translateX(0%)' }, { transform:'translateX(-100%)' }],
        { duration:650, delay:120, easing: easeInOut, fill:'forwards' }
      ).onfinish = () => { curtainLeft.style.display = 'none'; };

      curtainRight.animate(
        [{ transform:'translateX(0%)' }, { transform:'translateX(100%)' }],
        { duration:650, delay:120, easing: easeInOut, fill:'forwards' }
      ).onfinish = () => { curtainRight.style.display = 'none'; };

      heroSpan.animate(
        [{ transform:'translateY(100%)' }, { transform:'translateY(0%)' }],
        { duration:700, delay:280, easing: easeOut, fill:'forwards' }
      );
    };
  }, 1150);
}

// auto-run once on load — this is a one-shot preloader, not a toggle
run();