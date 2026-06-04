// ========================================
// AVATAR SYSTEM
// ========================================
var avatarGradients = [
  ['#ff9a9e','#fad0c4'],['#a18cd1','#fbc2eb'],['#fad0c4','#ffd1ff'],['#ffecd2','#fcb69f'],
  ['#ff9a9e','#fecfef'],['#a1c4fd','#c2e9fb'],['#d4fc79','#96e6a1'],['#84fab0','#8fd3f4'],
  ['#cfd9df','#e2ebf0'],['#a6c0fe','#f68084'],['#fccb90','#d57eeb'],['#e0c3fc','#8ec5fc'],
  ['#f093fb','#f5576c'],['#4facfe','#00f2fe'],['#43e97b','#38f9d7'],['#fa709a','#fee140'],
];
var avatarEmojis = ['🐱','🐶','🦊','🐼','🐨','🐰','🦁','🐸','🐵','🐯','🐮','🐷','🐭','🐹','🐻','🦄','🐙','🦋','🐞','🐝'];
var myAvatarChoice = 'gradient';

function getAvatarHTML(userName) {
  if (myAvatarChoice === 'gradient') {
    return '<span class="avatar" style="'+avatarStyle(userName)+'">'+userName.slice(0,1)+'</span>';
  } else if (myAvatarChoice && myAvatarChoice.startsWith('emoji-')) {
    var idx = parseInt(myAvatarChoice.split('-')[1]);
    return '<span class="avatar avatar-emoji" style="background:var(--white);">'+avatarEmojis[idx]+'</span>';
  } else {
    return '<span class="avatar" style="'+avatarStyle(userName)+'">'+userName.slice(0,1)+'</span>';
  }
}
function updateMyAvatar() {
  var ua = document.getElementById('topAvatar');
  if (!ua) return;
  ua.style.background = ''; ua.style.color = ''; ua.className = 'avatar';
  if (myAvatarChoice === 'gradient') {
    ua.style.background = avatarGradient(myProfile.name);
    ua.style.color = '#fff';
    ua.textContent = myProfile.name.slice(0,1);
  } else if (myAvatarChoice && myAvatarChoice.startsWith('emoji-')) {
    var idx = parseInt(myAvatarChoice.split('-')[1]);
    ua.textContent = avatarEmojis[idx];
    ua.style.background = 'var(--white)';
    ua.style.color = '#333';
  }
}
function renderAvatarPicker() {
  var container = document.getElementById('avatarPicker');
  if (!container || container.children.length) return;
  for (var i=0;i<8;i++) {
    var opt = document.createElement('span');
    opt.className = 'avatar-option';
    if (myAvatarChoice === 'gradient' && i === 0) opt.classList.add('selected');
    opt.style.background = 'linear-gradient(135deg,'+avatarGradients[i][0]+','+avatarGradients[i][1]+')';
    opt.textContent = myProfile.name.slice(0,1);
    opt.title = '渐变色'+(i+1);
    opt.onclick = function(idx){return function(){
      myAvatarChoice = 'gradient';
      renderAvatarPicker(); updateMyAvatar();
      saveAvatarChoice();
    };}(i);
    container.appendChild(opt);
  }
  for (var j=0;j<12;j++) {
    var e = document.createElement('span');
    e.className = 'avatar-option avatar-emoji';
    if (myAvatarChoice === 'emoji-'+j) e.classList.add('selected');
    e.textContent = avatarEmojis[j];
    e.title = '表情头像';
    e.onclick = function(idx){return function(){
      myAvatarChoice = 'emoji-'+idx;
      renderAvatarPicker(); updateMyAvatar();
      saveAvatarChoice();
    };}(j);
    container.appendChild(e);
  }
}
function saveAvatarChoice() {
  if (currentUser) {
    userDB[currentUser].avatarChoice = myAvatarChoice;
    var update={username:myProfile.name,role:myProfile.role,role_label:myProfile.roleLabel,city:myProfile.city,work_status:myProfile.workStatus,bio:myProfile.bio};
    delete update.xp;delete update.level;delete update.trust_score;
    sb.from("profiles").update(update).eq("username",currentUser).then(function(){});
  }
}
