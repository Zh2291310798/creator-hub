// ========================================
// TRACKING — event logging (MVP: localStorage)
// ========================================
function track(e,p){try{p=p||{};var sid=getSessionId();var a=JSON.parse(localStorage.getItem("creatorhub_events")||"[]");a.push({event:e,props:p,user:localStorage.getItem("creatorhub_session")||"anonymous",timestamp:Date.now(),session_id:sid});if(a.length>1000)a.splice(0,a.length-1000);localStorage.setItem("creatorhub_events",JSON.stringify(a));if(typeof sb!=="undefined"&&sb.from){sb.from("tracking_events").insert({event:e,props:p,username:currentUser||"anonymous",session_id:sid}).then(function(){},function(){});}}catch(_){}}

// ========================================
// ERROR CAPTURE & A/B ENGINE
// ========================================

// Global JS error capture
window.addEventListener('error',function(e){
  if(e.error){track('js_error',{message:e.error.message||'Unknown error',filename:e.filename?e.filename.split('/').pop():'',lineno:e.lineno||0,colno:e.colno||0});}
});
window.addEventListener('unhandledrejection',function(e){
  track('js_error',{message:'UnhandledRejection: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason)),filename:'',lineno:0,colno:0});
});

// A/B testing engine
var AB={
  get:function(experimentId){
    var key='ab_'+experimentId;
    var bucket=localStorage.getItem(key);
    if(!bucket){bucket=Math.random()<0.5?'A':'B';localStorage.setItem(key,bucket);track('ab_exposure',{experiment:experimentId,bucket:bucket});}
    return bucket;
  },
  force:function(experimentId,bucket){localStorage.setItem('ab_'+experimentId,bucket);},
  list:function(){var r={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('ab_')===0)r[k.slice(3)]=localStorage.getItem(k);}return r;},
  reset:function(experimentId){localStorage.removeItem('ab_'+experimentId);}
};
// ========================================
// ========================================
// SUPABASE BACKEND
// ========================================
const SB_URL='https://bbjdrjbqkhtcqvduqmpj.supabase.co';
const SB_KEY='sb_publishable_KwoaGM3yrgCWUolbwfCHVg_Qk41OFsv';
const sb=supabase.createClient(SB_URL,SB_KEY);

// Global Supabase error interceptor
(function(){
  var _from=sb.from.bind(sb);
  sb.from=function(t){
    var qb=_from(t);
    var _origThen=qb.then;
    qb.then=function(f,r){
      return _origThen.call(qb,function(res){
        if(res&&res.error)console.error("["+t+"]",(res.error&&res.error.message)||res.error);
        return f?f(res):res;
      },function(e){
        console.error("["+t+"]",(e&&e.message)||e);
        if(r)return r(e);
      });
    };
    return qb;
  };
})();

// ========================================
// AUTH
// ========================================
var currentUser=null;
var myProfileId=null;
var isAdmin=false;
var _myLikes={};
var _likeLock={};
function canDeleteOwner(owner){return isAdmin||owner===currentUser||owner===myProfile.name||owner==="我";}

// Supabase session -> local state
async function loadSession(user){
  captureInviteCode();
  currentUser=user.user_metadata.username||user.email.split('@')[0];
  myProfileId=user.id;
  var _a=await sb.from('profiles').select('*').eq('id',user.id).single();
  var p=_a.data;
  isAdmin=!!(p&&p.is_admin);
  if(p){
    myProfile.name=p.username;
    myProfile.role=p.role;
    myProfile.roleLabel=p.role_label;
    myProfile.avatar=p.username.slice(0,1);
    myProfile.city=p.city||'';
    myProfile.workStatus=p.work_status||'';
    myProfile.connectedPlatforms=safeArray(p.connected_platforms);
    if(p.avatar_choice)myAvatarChoice=p.avatar_choice;
    myLevel=p.level||1;myXP=p.xp||0;
  }
  var _x=await sb.from('xp_records').select('amount').eq('username',currentUser);
  if(_x.data){myXP=0;_x.data.forEach(function(r){myXP+=r.amount;});myLevel=Math.floor(myXP/100)+1;}
  var _o=await sb.from('onboarding_status').select('*').eq('username',currentUser).maybeSingle();
  if(_o.data&&_o.data.completed)localStorage.setItem('creatorhub_onboarding_'+currentUser,'done');
  var today=new Date().toDateString();
  var lastLogin=localStorage.getItem('creatorhub_lastLogin');
  if(lastLogin!==today){localStorage.setItem('creatorhub_lastLogin',today);await sb.from('xp_records').insert({username:currentUser,amount:25,reason:'每日登录'});myXP+=25;myLevel=Math.floor(myXP/100)+1;await sb.from('profiles').update({xp:myXP,level:myLevel}).eq('id',user.id);}
  document.getElementById('authOverlay').style.display='none';
  document.getElementById('mainApp').style.display='';
  var ua2=document.getElementById('topAvatar');
  if(ua2){ua2.textContent=myProfile.avatar;ua2.style.background=avatarGradient(myProfile.name);ua2.style.color='#fff';}
  document.querySelector('.user-mini .avatar').textContent=myProfile.avatar;
  document.querySelector('.user-mini span:last-child').textContent=myProfile.name+' ⚙';
  document.getElementById('setName').value=myProfile.name;
  document.getElementById('setRole').value=myProfile.role;
  track('user_login',{is_new:false});
  renderProfile();updateLevelDisplay();updateMyAvatar();
  await checkOnboarding();
  await checkNotifications();
  await processInviteCode();
  updateNotifyBadge();
  showToast('欢迎回来，'+myProfile.name+'！👋');
}

async function initAuth(){
  captureInviteCode();
  var _s=await sb.auth.getSession();
  if(_s.data.session&&_s.data.session.user){
    await loadSession(_s.data.session.user);
    init();
  }
}

sb.auth.onAuthStateChange(function(event,session){
  if(event==='SIGNED_IN'&&session&&!currentUser){loadSession(session.user).then(function(){init();});}
});

async function doLogin(){
  var email=document.getElementById('loginUser').value.trim();
  var pass=document.getElementById('loginPass').value.trim();
  var err=document.getElementById('loginError');
  err.textContent='';
  if(!email||!pass){err.textContent='请输入邮箱和密码';return;}
  var _r=await sb.auth.signInWithPassword({email:email,password:pass});
  if(_r.error){err.textContent=_r.error.message==='Invalid login credentials'?'邮箱或密码错误':_r.error.message;return;}
  if(_r.data.user){await loadSession(_r.data.user);init();}
}

async function doRegister(){
  captureInviteCode();
  var email=document.getElementById('regEmail').value.trim();
  var user=document.getElementById('regUser').value.trim();
  var pass=document.getElementById('regPass').value.trim();
  var pass2=document.getElementById('regPass2').value.trim();
  var role=document.getElementById('regRole').value;
  var err=document.getElementById('regError');
  err.textContent='';err.style.color='var(--red)';
  if(!email||!user||!pass){err.textContent='请填写所有字段';return;}
  if(user.length<2){err.textContent='用户名至少2个字符';return;}
  if(pass.length<6){err.textContent='密码至少6位';return;}
  if(pass!==pass2){err.textContent='两次密码不一致';return;}
  var roleMap={creator:'创作者 / 达人',brand:'品牌方',recruiter:'招聘方',freelancer:'自由职业者',student:'🎓 在校学生 / 应届毕业生',career_switcher:'🆕 想转行入行'};
  var existing=await sb.from('profiles').select('id').eq('username',user).maybeSingle();
  if(existing.error){err.textContent='注册失败，请稍后重试';return;}
  if(existing.data){err.textContent='用户名已被占用';return;}
  var _r=await sb.auth.signUp({email:email,password:pass,options:{data:{username:user,role:role,role_label:roleMap[role]}}});
  if(_r.error){err.textContent=_r.error.message==='User already registered'?'该邮箱已被注册':_r.error.message;return;}
  // Manually create profile (bypass trigger)
  if(_r.data.user){
    var ins=await sb.from('profiles').insert({id:_r.data.user.id,email:email,username:user,role:role,role_label:roleMap[role],avatar_text:user});
    if(ins.error){
      track('reg_profile_fail',{error:ins.error.message});
      var created=await sb.from('profiles').select('id').eq('id',_r.data.user.id).maybeSingle();
      if(!created.data){err.textContent='注册失败，请稍后重试';return;}
    }
  }
  track('user_register',{role:role});
  if(_r.data.user&&_r.data.session){await loadSession(_r.data.user);init();showToast('注册成功！欢迎加入 CreatorHub 🎉');}
  else{showLogin();showToast('注册成功！请登录');document.getElementById('loginUser').value=email;document.getElementById('loginPass').value='';var err2=document.getElementById('loginError');err2.textContent='注册成功，请登录';err2.style.color='var(--sage)';}
}

function showRegister(){
  document.getElementById('loginForm').style.display='none';
  document.getElementById('registerForm').style.display='';
  document.getElementById('loginError').textContent='';
}
function showLogin(){
  document.getElementById('loginForm').style.display='';
  document.getElementById('registerForm').style.display='none';
  document.getElementById('regError').textContent='';
}

async function doLogout(){
  if(window._pollTimer)clearInterval(window._pollTimer);
  try{await sb.removeAllChannels();}catch(e){}
  await sb.auth.signOut();
  currentUser=null;
  myProfileId=null;
  location.reload();
}

// ========================================

// DATA LAYER
// ========================================

async function loadNotifications(){
  if(!currentUser)return[];
  var _n=await sb.from('notifications').select('*').eq('username',currentUser).order('created_at',{ascending:false}).limit(50);
  return _n.data||[];
}

async function saveXP(amount,reason){
  if(!currentUser||!myProfileId)return;
  await sb.from('xp_records').insert({username:currentUser,amount:amount,reason:reason});
  myXP+=amount;myLevel=Math.floor(myXP/100)+1;
  await sb.from('profiles').update({xp:myXP,level:myLevel}).eq('id',myProfileId);
  updateLevelDisplay();
}

function setupRealtime(){
  if(window._pollTimer)clearInterval(window._pollTimer);
  if(!currentUser)return;
  sb.channel("chat-"+currentUser)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:"recipient=eq."+currentUser},
      function(p){renderChatMessages();updateChatBadge();checkNotifications();})
    .subscribe(function(s){if(s==="SUBSCRIBED")console.log("Realtime: chat connected");if(s==="CHANNEL_ERROR")console.error("Realtime: chat error");});
  sb.channel("world-chat")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"world_messages"},
      function(p){renderWorldChat();})
    .subscribe();
  sb.channel("notif-"+currentUser)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"username=eq."+currentUser},
      function(p){if(p.new){saveNotify(emoFor(p.new.type),p.new.from_user+' → '+p.new.content.slice(0,30),p.new.content,actFor(p.new.type));}updateNotifyBadge();})
    .subscribe();
  sb.channel("posts-live")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts"},
      function(p){if(p.new){posts.unshift(normalizePost(p.new));renderPosts("all");}})
    .subscribe();
  console.log("Realtime channels subscribed for "+currentUser);
  window._pollTimer=setInterval(pollUpdates,10000);
  setupPollingOptimizers();
}
function pollUpdates(){
  if(!currentUser||document.hidden)return;
  var sinceISO=sessionStorage.getItem("_poll_cursor")||new Date(Date.now()-10000).toISOString();
  var _pids=posts.slice(0,100).map(function(p){return p.id;});
  sb.rpc('get_poll_updates',{since_ts:sinceISO,username_query:currentUser,post_ids:_pids}).then(function(r){
    if(r.error){console.error("Poll RPC failed:",r.error);return;}
    var d=r.data;if(!d)return;
    (d.new_posts||[]).forEach(function(p){if(!posts.find(function(x){return x.id===p.id;}))posts.push(normalizePost(p));});
    if((d.new_posts||[]).length>0)renderPosts("all");
    (d.notifs||[]).forEach(function(n){saveNotify(emoFor(n.type),n.from_user+' → '+n.content.slice(0,30),n.content,actFor(n.type),n.created_at);});
    if((d.notifs||[]).length>0)updateNotifyBadge();
    (d.chat_msgs||[]).forEach(function(m){
      var other=m.sender===currentUser?m.recipient:m.sender;
      var cid="c_"+[currentUser,other].sort().join("_");
      var ct=contacts.find(function(c){return c.id===cid||c.id==='f_'+other||c.name===other;});
      if(!ct){ct={id:cid,name:other,avatar:other.slice(0,1),avatarBg:"",platform:"all",unread:0,lastMsg:"",messages:[]};contacts.push(ct);}
      var foundMsg=ct.messages.find(function(x){return x.text===m.content&&x.from===(m.sender===currentUser?"me":"them");});
      if(!foundMsg){var msgTime=new Date(m.created_at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});ct.messages.push({from:m.sender===currentUser?"me":"them",text:m.content,time:msgTime});ct.lastMsg=m.content.slice(0,30);if(m.sender!==currentUser&&!m.is_read)ct.unread=(ct.unread||0)+1;}
    });
    if((d.chat_msgs||[]).length>0){renderChatMessages();updateChatBadge();renderChatContacts();}
    (d.new_comments||[]).forEach(function(c){if(!postComments[c.post_id])postComments[c.post_id]=[];if(!postComments[c.post_id].find(function(x){return x.author===c.author&&x.text===c.content;}))postComments[c.post_id].push({author:c.author,text:c.content,time:formatTime(c.created_at)});});
    if((d.new_comments||[]).length>0)renderPosts("all");
    if((d.likes_sync||[]).length>0){d.likes_sync.forEach(function(ls){if(_likeLock[ls.post_id]&&Date.now()-_likeLock[ls.post_id]<5000)return;var pp=posts.find(function(x){return x.id===ls.post_id;});if(pp)pp.likes=ls.likes;});renderPosts("all");}
    (d.new_recruits||[]).forEach(function(r){if(!recruits.find(function(x){return x.id===r.id;}))recruits.unshift(r);});
    if((d.new_recruits||[]).length>0)renderRecruits();
    (d.new_matches||[]).forEach(mergeMatchDemandRow);
    if((d.new_matches||[]).length>0)renderMatch();
    (d.new_local||[]).forEach(function(ld){if(!localDemands.find(function(x){return x.id===ld.id;}))localDemands.unshift(ld);});
    if((d.new_local||[]).length>0)renderLocalMatch();
    var maxTs=d._max_ts;
    if(!maxTs){var allRows=[].concat(d.new_posts||[],d.notifs||[],d.chat_msgs||[],d.new_comments||[],d.new_recruits||[],d.new_matches||[],d.new_local||[]);if(allRows.length>0){maxTs=allRows.reduce(function(m,row){var t=row.created_at;return t&&t>m?t:m;},"");}}
    if(maxTs)sessionStorage.setItem("_poll_cursor",maxTs);
  });
}
function setupPollingOptimizers(){
  if(!window._pollVisibilityBound){
    window._pollVisibilityBound=true;
    document.addEventListener('visibilitychange',function(){
      if(window._pollTimer)clearInterval(window._pollTimer);
      if(!document.hidden){pollUpdates();window._pollTimer=setInterval(pollUpdates,10000);}
      else window._pollTimer=setInterval(pollUpdates,30000);
    });
  }
  if(!window._heartbeatTimer){
    window._heartbeatTimer=setInterval(function(){
      if(currentUser)sb.from('profiles').update({last_seen:new Date().toISOString()}).eq('username',currentUser).then(function(){}).catch(function(){});
    },30000);
  }
}

// ========================================

// ========================================
// LOAD ALL DATA FROM SUPABASE
// ========================================
async function loadAllData(){
  if(!currentUser)return;
  showLoadingSkeletons();
  try{
    // Load posts
    var rp=await sb.from("posts").select("*").order("created_at",{ascending:false}).limit(100);
    if(rp.data&&rp.data.length>0){rp.data.forEach(function(p){if(!posts.find(function(x){return x.id===p.id;})){posts.push(normalizePost(p));}});}
    // Load my likes
    var rpl=await sb.from("post_likes").select("post_id").eq("username",currentUser);
    _myLikes={};
    if(rpl.data)rpl.data.forEach(function(l){_myLikes[l.post_id]=true;});
    // Load recruits
    var rr=await sb.from("recruits").select("*").order("created_at",{ascending:false}).limit(50);
    if(rr.data&&rr.data.length>0){rr.data.forEach(function(r){if(!recruits.find(function(x){return x.id===r.id;}))recruits.unshift(r);});}
    // Load local demands
    var rl=await sb.from("local_demands").select("*").order("created_at",{ascending:false}).limit(50);
    if(rl.data&&rl.data.length>0){localStorage.setItem("creatorhub_local_demands",JSON.stringify(rl.data));}
    // Load v2 match demands with deal state
    var rm=await sb.from("match_demands").select("*").order("created_at",{ascending:false}).limit(100);
    if(rm.data&&rm.data.length>0){rm.data.forEach(mergeMatchDemandRow);}
    // Load friends
    var rf=await sb.from("friends").select("friend_name").eq("username",currentUser);
    if(rf.data&&rf.data.length>0){myFriends=rf.data.map(function(f){return f.friend_name;});localStorage.setItem("creatorhub_friends_"+currentUser,JSON.stringify(myFriends));}
    // Load chat history
    var rc=await sb.from("chat_messages").select("*").or("sender.eq."+currentUser+",recipient.eq."+currentUser).order("created_at",{ascending:true}).limit(200);
    if(rc.data&&rc.data.length>0){
      rc.data.forEach(function(m){
        var other=m.sender===currentUser?m.recipient:m.sender;
        var cid="c_"+[currentUser,other].sort().join("_");
        var existing=contacts.find(function(c){return c.id===cid;});
        if(!existing){contacts.push({id:cid,name:other,avatar:other.slice(0,1),avatarBg:"",platform:"all",unread:0,lastMsg:"",messages:[]});existing=contacts[contacts.length-1];}
        existing.messages.push({from:m.sender===currentUser?"me":"them",text:m.content,time:new Date(m.created_at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})});
        existing.lastMsg=m.content.slice(0,30);
        if(m.sender!==currentUser&&!m.is_read)existing.unread=(existing.unread||0)+1;
      });
    }
  }catch(e){
    showLoadError(e);
  }finally{
    renderPosts("all");
    renderRecruits();
    renderMatch();
    renderMyDeals();
    renderFriendsList();
    renderChatContacts();
    setupRealtime();
  }
}
// AVATAR SYSTEM
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
var myAvatarChoice = 'gradient'; // 'gradient' | emoji index | custom gradient index

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
  // Gradient options
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
  // Emoji options
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
    sb.from("profiles").update({username:myProfile.name,role:myProfile.role,role_label:myProfile.roleLabel,city:myProfile.city,work_status:myProfile.workStatus,bio:myProfile.bio}).eq("username",currentUser).then(function(){});
  }
}

// ========================================
// XP & LEVEL SYSTEM
// ========================================
var userXP = {};
try { var savedXP = localStorage.getItem('creatorhub_xp'); if (savedXP) userXP = JSON.parse(savedXP); } catch(e) { userXP = {}; }

function getLevel(xp) {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 850) return 4;
  if (xp < 1300) return 5;
  if (xp < 1900) return 6;
  if (xp < 2600) return 7;
  if (xp < 3500) return 8;
  if (xp < 4600) return 9;
  return 10;
}
function xpForLevel(lv) {
  var thresholds = [0,100,250,500,850,1300,1900,2600,3500,4600,6000];
  return thresholds[lv] || 6000;
}
function xpForNextLevel(xp) {
  var lv = getLevel(xp);
  if (lv >= 10) return 0;
  return xpForLevel(lv+1) - xp;
}
function xpProgress(xp) {
  var lv = getLevel(xp);
  if (lv >= 10) return 100;
  var base = xpForLevel(lv);
  var next = xpForLevel(lv+1);
  return Math.floor(((xp - base) / (next - base)) * 100);
}

async function addXP(amount, reason) { if(!currentUser)return; var oldLv=myLevel; saveXP(amount,reason).then(function(){if(myLevel>oldLv){showToast("🎉 升级了！Lv."+myLevel+" 「"+getLevelTitle(myLevel)+"」");burstSparks(window.innerWidth/2,window.innerHeight/2,"🎉");}updateLevelDisplay();}); }

function getLevelTitle(lv) {
  var titles = ['','萌新','学徒','探路者','创作者','达人','专家','大师','传奇','巨星','创世神'];
  return titles[lv] || '创世神';
}

function updateLevelDisplay() {
  if (!currentUser) return;
  var xp = myXP || 0;
  var lv = getLevel(xp);
  var prog = xpProgress(xp);
  var bar = document.getElementById('levelBar');
  var txt = document.getElementById('levelText');
  if (bar) bar.style.setProperty('--progress', prog + '%');
  if (txt) txt.textContent = 'Lv.' + lv + ' ' + getLevelTitle(lv);
  var mini = document.getElementById('topLevelBadge');
  if (mini) mini.textContent = 'Lv.' + lv;
}

// CSS for the progress bar (use JS to set width)
document.addEventListener('DOMContentLoaded', function(){
  var style = document.createElement('style');
  style.textContent = '.level-bar::after { width: var(--progress, 0%); }';
  document.head.appendChild(style);
  setTimeout(function(){try{var perf=performance.getEntriesByType("navigation")[0];if(perf&&!sessionStorage.getItem("_perf_logged")){track("page_performance",{dom_ready:Math.round(perf.domContentLoadedEventEnd-perf.domContentLoadedEventStart),load_complete:Math.round(perf.loadEventEnd-perf.loadEventStart),total:Math.round(perf.loadEventEnd)});sessionStorage.setItem("_perf_logged","1");}}catch(e){}},0);
});

// ========================================
// DATA
// ========================================

// Chat contacts
const contacts = [
  { id: "c1", name: "美妆达人小A", avatar: "A", avatarBg: "xhs-bg", platform: "xhs", unread: 2, lastMsg: "好的，这个合作可以聊一下具体细节", messages: [
    { from: "them", text: "你好！看到你在小红书上的内容，很有风格", time: "10:20" },
    { from: "me", text: "谢谢！你们品牌主要做什么方向？", time: "10:22" },
    { from: "them", text: "我们是做护肤品的，想找一些真实体验类的推广", time: "10:24" },
    { from: "them", text: "好的，这个合作可以聊一下具体细节", time: "10:25" }
  ]},
  { id: "c2", name: "数码品牌方老张", avatar: "张", avatarBg: "dy-bg", platform: "douyin", unread: 1, lastMsg: "我们想找抖音科技类主播做开箱", messages: [
    { from: "them", text: "你好，你们频道粉丝画像是什么样？", time: "09:15" },
    { from: "me", text: "主要是25-35男性，科技数码爱好者", time: "09:18" },
    { from: "them", text: "我们想找抖音科技类主播做开箱", time: "09:20" }
  ]},
  { id: "c3", name: "美食主播大刘", avatar: "刘", avatarBg: "ks-bg", platform: "kuaishou", unread: 0, lastMsg: "一起搞个联名直播怎么样", messages: [
    { from: "me", text: "你上次那个火锅探店选题真不错", time: "昨天" },
    { from: "them", text: "哈哈谢谢！一起搞个联名直播怎么样", time: "昨天" }
  ]},
  { id: "c4", name: "B站UP主小王", avatar: "王", avatarBg: "bi-bg", platform: "bilibili", unread: 0, lastMsg: "你那个剪辑教程能转载吗", messages: [
    { from: "them", text: "你那个剪辑教程能转载吗", time: "周一" },
    { from: "me", text: "可以的，标明出处就行", time: "周一" }
  ]},
  { id: "c5", name: "MCN机构-星辰", avatar: "星", avatarBg: "", platform: "all", unread: 0, lastMsg: "我们正在招募优质达人，有兴趣吗", messages: [
    { from: "them", text: "我们正在招募优质达人，有兴趣吗", time: "上周五" }
  ]}
];

// Recruit listings
const recruits = [
  {
    id: "r1", title: "小红书美妆达人招募", poster: "花漾美妆品牌", avatar: "花", avatarBg: "xhs-bg",
    status: "急招", statusClass: "urgent",
    budget: "¥5,000-15,000 / 条",
    desc: "寻找小红书美妆类达人，粉丝量5k-50k均可，需要真实使用体验类内容，不要求硬广风格。",
    detail: "需要发布1-3条小红书笔记，包含产品真实使用前后对比。要求原创拍摄，拒绝搬运。粉丝画像需为18-35岁女性为主。合作方式：基础费+佣金分成，长期合作可签框架协议。",
    platforms: ["xhs"],
    tags: ["美妆", "护肤品", "真实体验", "长期合作"],
    type: "maker"
  },
  {
    id: "r2", title: "抖音数码产品开箱主播", poster: "极客科技", avatar: "极", avatarBg: "dy-bg",
    status: "招募中", statusClass: "active-recruit",
    budget: "¥8,000-20,000 / 场",
    desc: "抖音科技类目主播，需要做新品手机/耳机开箱直播，要求有一定数码知识储备。",
    detail: "每周1-2场开箱直播，时长1-2小时。需要主播对数码产品有真实了解，能回答观众提问。提供全套产品样机，可长期签约。优先考虑有科技类内容创作经验的主播。",
    platforms: ["douyin"],
    tags: ["数码", "开箱", "直播", "科技"],
    type: "maker"
  },
  {
    id: "r3", title: "品牌小红书运营专员", poster: "轻食主义", avatar: "轻", avatarBg: "xhs-bg",
    status: "急招", statusClass: "urgent",
    budget: "¥12K-18K / 月",
    desc: "负责品牌小红书账号日常运营，要求熟悉小红书平台规则和内容趋势。",
    detail: "全职岗位，负责品牌小红书账号内容规划、笔记创作、数据分析、KOC合作对接。要求1年以上小红书运营经验，有食品/生活方式类目经验优先。五险一金+弹性工作。",
    platforms: ["xhs"],
    tags: ["运营", "全职", "食品", "品牌方"],
    type: "merchant"
  },
  {
    id: "r4", title: "全平台短视频编导", poster: "星辰MCN", avatar: "星", avatarBg: "",
    status: "招募中", statusClass: "active-recruit",
    budget: "¥15K-25K / 月",
    desc: "负责旗下达人多平台短视频内容策划与脚本创作，覆盖抖音/小红书/B站。",
    detail: "需要根据每个平台特性策划差异化内容，管理3-5个达人账号。要求2年以上短视频编导经验，有爆款案例优先。熟悉各平台推荐算法和热门趋势。",
    platforms: ["douyin", "xhs", "bilibili"],
    tags: ["编导", "多平台", "MCN", "内容策划"],
    type: "tech"
  },
  {
    id: "r5", title: "快手直播带货主播", poster: "优选供应链", avatar: "优", avatarBg: "ks-bg",
    status: "招募中", statusClass: "active-recruit",
    budget: "底薪¥8K + 高额提成",
    desc: "招募快手平台带货主播，源头工厂直供，品类为家居日用+小家电。",
    detail: "每天直播4-6小时，可选日间或晚间时段。提供完整供应链支持和直播间搭建。无经验可培训，但要求表达流畅、有亲和力。提成比例行业领先。",
    platforms: ["kuaishou"],
    tags: ["直播带货", "家居", "供应链", "高提成"],
    type: "maker"
  },
  {
    id: "r6", title: "B站UP主商务对接", poster: "游戏谷工作室", avatar: "游", avatarBg: "bi-bg",
    status: "招募中", statusClass: "active-recruit",
    budget: "面议（含CPM分成）",
    desc: "游戏类B站UP主招募，做新游试玩和评测内容，需粉丝≥1万。",
    detail: "提供新游戏抢先体验资格+创作激励金。内容形式可以是实况解说、评测视频或直播。合作周期灵活，单次或长期均可。",
    platforms: ["bilibili"],
    tags: ["游戏", "评测", "UP主", "新游"],
    type: "maker"
  },
  {
    id: "r7", title: "TikTok英文主播招募", poster: "跨境出海小林", avatar: "林", avatarBg: "",
    status: "急招", statusClass: "urgent",
    budget: "¥8,000-25,000 / 月",
    desc: "招募TikTok英语直播主播，面向欧美市场做中国产品展示和讲解。",
    detail: "需要英语流利，有镜头感。不需要露脸，以产品展示为主。每天直播3-5小时，覆盖欧美黄金时段。提供完整选品和供应链支持。",
    platforms: ["tiktok"],
    tags: ["出海", "英语", "TikTok", "直播"],
    type: "maker"
  },
  {
    id: "r8", title: "得物潮牌内容合作", poster: "得物穿搭师Coco", avatar: "C", avatarBg: "xhs-bg",
    status: "招募中", statusClass: "active-recruit",
    budget: "¥2,000-6,000 / 篇",
    desc: "寻找得物平台潮流穿搭创作者，做球鞋/潮牌开箱和搭配内容。",
    detail: "合作方式灵活，单篇或系列均可。需要有一定潮流认知和摄影能力。优先考虑已有得物账号的创作者。",
    platforms: ["dewu"],
    tags: ["潮流", "球鞋", "开箱", "穿搭"],
    type: "maker"
  },
  {
    id: "r9", title: "YouTube中文频道内容合作", poster: "跨境出海小林", avatar: "林", avatarBg: "",
    status: "招募中", statusClass: "active-recruit",
    budget: "¥5,000-15,000 / 条",
    desc: "寻找YouTube中文创作者，制作中国文化/美食/旅行类长视频内容。",
    detail: "视频时长8-20分钟，需要有故事性和制作质量。面向海外华人及对中国文化感兴趣的外国观众。可长期合作，提供选题和流量支持。",
    platforms: ["youtube"],
    tags: ["YouTube", "长视频", "文化", "美食"],
    type: "maker"
  }
];

// Match listings (brand ↔ creator)
const brandSeekingData = [
  {
    id: "b1", title: "护肤品品牌找小红书+抖音达人", brand: "薇诺肌", avatar: "薇", avatarBg: "xhs-bg",
    budget: "¥3,000-10,000/条",
    desc: "新品精华液推广，需要30位中小达人做真实测评，注重内容真实度而非粉丝量。",
    detail: "产品主打敏感肌修护，希望达人真实使用7天后产出内容。提供全套产品+成分检测报告。",
    platforms: ["xhs", "douyin"],
    tags: ["护肤", "测评", "中小达人", "真实使用"]
  },
  {
    id: "b2", title: "运动品牌找抖音+快手带货主播", brand: "跃动体育", avatar: "跃", avatarBg: "dy-bg",
    budget: "¥10,000-50,000/场+佣金",
    desc: "新季度运动鞋服系列，找有运动健身属性的主播做直播带货。",
    detail: "品牌提供全套样品+直播话术培训+投流支持。要求主播有运动/健身相关人设，直播间平均在线≥200人。",
    platforms: ["douyin", "kuaishou"],
    tags: ["运动", "直播带货", "鞋服", "品牌专场"]
  }
];

const creatorSeekingData = [
  {
    id: "c1", title: "小红书10w粉穿搭博主找服饰品牌合作", creator: "穿搭师Nina", avatar: "N", avatarBg: "xhs-bg",
    budget: "期望¥5,000+/条",
    desc: "粉丝画像：22-35岁一二线城市女性，内容风格：极简通勤穿搭，可接季度代言或单条合作。",
    detail: "账号数据：平均笔记曝光50w+，互动率8%+。可提供详细粉丝画像和往期合作案例。接受服饰、配饰、鞋包品类。",
    platforms: ["xhs"],
    tags: ["穿搭", "10w粉", "通勤风", "女性用户"]
  },
  {
    id: "c2", title: "抖音50w+剧情类达人开放商务合作", creator: "剧有趣工作室", avatar: "剧", avatarBg: "dy-bg",
    budget: "¥30,000+/条 或 项目制",
    desc: "擅长轻喜剧/反转剧情，单条平均播放300w+，开放品牌植入、定制剧情等合作形式。",
    detail: "团队制作，含编导+拍摄+后期全链条。可接品牌定制短剧（3-5集系列），或单条软植入。合作过美妆、食品、3C等多品类。",
    platforms: ["douyin"],
    tags: ["剧情", "50w粉", "品牌植入", "专业团队"]
  },
  {
    id: "c3", title: "全平台美食达人寻餐饮品牌合作", creator: "吃货阿Ken", avatar: "K", avatarBg: "",
    budget: "¥2,000-8,000/条 视平台而定",
    desc: "覆盖小红书+抖音+B站三平台，内容以探店+自制美食为主，累计粉丝30w+。",
    detail: "可做探店拍摄、菜品评测、联名菜单开发。注重内容质感和真实评价，不接受纯硬广。",
    platforms: ["xhs", "douyin", "bilibili"],
    tags: ["美食", "探店", "多平台", "联名"]
  }
];

// Community posts
let posts = [
  {
    id: "p1", title: "小红书笔记限流的10个自查方法", category: "guide", categoryLabel: "干货教程",
    maker: "运营老司机", avatar: "运", time: "2小时前",
    desc: "做了3年小红书运营，总结一下笔记被限流时应该从哪些方面排查...",
    platform: "xhs",
    likes: 238, comments: 56
  },
  {
    id: "p2", title: "从0到10w粉——我在抖音做知识类账号的一年", category: "exp", categoryLabel: "经验分享",
    maker: "知识博主小李", avatar: "李", time: "5小时前",
    desc: "纯素人起步，不投流不买粉，全靠内容一步步做起来的真实复盘...",
    platform: "douyin",
    likes: 412, comments: 89
  },
  {
    id: "p3", title: "品牌方找达人合作的5个坑，我都踩过了", category: "exp", categoryLabel: "经验分享",
    maker: "品牌主理人阿Jay", avatar: "J", time: "昨天",
    desc: "作为品牌方这两年和50+达人合作过，分享一些血泪教训...",
    platform: "all",
    likes: 327, comments: 102
  },
  {
    id: "p4", title: "跨平台运营到底值不值得？抖音+小红书真实对比", category: "qa", categoryLabel: "求助问答",
    maker: "纠结中的创作者", avatar: "纠", time: "昨天",
    desc: "目前在抖音有8w粉丝，在想要不要同时做小红书。两边内容风格差异大，担心精力不够...",
    platform: "all",
    likes: 156, comments: 73
  },
  {
    id: "p5", title: "直播带货话术大全（新人必看）", category: "guide", categoryLabel: "干货教程",
    maker: "金牌主播培训", avatar: "培", time: "2天前",
    desc: "整理了30套经过实战检验的直播话术模板，覆盖开播、互动、逼单、转款各个阶段...",
    platform: "all",
    likes: 891, comments: 134
  },
  {
    id: "p6", title: "B站恰饭视频怎么做才不被骂？", category: "qa", categoryLabel: "求助问答",
    maker: "B站小透明", avatar: "B", time: "3天前",
    desc: "接到第一个商单但是很紧张，怕被粉丝说恰烂饭。有没有UP主前辈分享一下经验...",
    platform: "bilibili",
    likes: 198, comments: 67
  },
  {
    id: "p7", title: "2025年短视频行业趋势预判", category: "news", categoryLabel: "行业动态",
    maker: "行业观察员", avatar: "观", time: "3天前",
    desc: "AI生成内容、平台政策变化、品牌预算流向...聊聊今年可能影响创作者生态的几件大事...",
    platform: "all",
    likes: 445, comments: 98
  }
];

let nextPostId = 8;

// ========================================
// Match message dialog
var _matchMsgTarget = '';
function openMatchMsg(e,name,role){
  _matchMsgTarget = name+' ('+role+')';
  document.getElementById('msgDialogTarget').textContent = '发送给：'+_matchMsgTarget;
  document.getElementById('msgDialogInput').value = '';
  document.getElementById('msgDialog').classList.add('show');
  setTimeout(function(){ document.getElementById('msgDialogInput').focus(); },200);
}
function closeMatchMsg(){
  document.getElementById('msgDialog').classList.remove('show');
}
function sendMatchMsg(){
  var msg = document.getElementById('msgDialogInput').value.trim();
  if(!msg){ showToast('请写一段留言');return; }
  closeMatchMsg();
  track('match_intent_send',{target_user:_matchMsgTarget});
  // Extract actual name from "name (role)" format
  var targetName=_matchMsgTarget.replace(/\s*\(.*\)\s*/,'');
  deliverNotification(targetName,'🤝 合作意向：'+msg,'对接-'+targetName);
  showToast('已发送意向给 '+_matchMsgTarget+'，对方将在聊天中收到通知 💌');
  document.getElementById('msgDialogInput').value = '';
}

// Match publish
function toggleMatchForm(){
  var f=document.getElementById('matchForm');
  f.style.display=f.style.display==='none'?'':'none';
}
function publishMatch(){
  var role=document.getElementById('matchRole').value;
  var title=document.getElementById('matchTitle').value.trim();
  var desc=document.getElementById('matchDesc').value.trim();
  var budget=document.getElementById('matchBudget').value.trim();
  var fb=document.getElementById('matchFeedback');
  if(!title||!desc){fb.textContent='标题和描述不能为空！';fb.style.color='var(--red)';return;}
  var sel=document.getElementById('matchPlatform');
  var platforms=Array.from(sel.selectedOptions).map(function(o){return o.value;});
  if(!platforms.length)platforms=['all'];
  var tags=document.getElementById('matchTags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
  var item={
    id:'m'+Date.now(),title:title,budget:budget||'面议',desc:desc,
    platforms:platforms,tags:tags.length?tags:['对接'],
    detail:desc,deal_status:'open',deal_partner:''
  };
  if(role==='brand'){
    item.brand=myProfile.name;item.avatar=myProfile.name.slice(0,1);item.avatarBg='';
    brandSeekingData.unshift(item);
  }else{
    item.creator=myProfile.name;item.avatar=myProfile.name.slice(0,1);item.avatarBg='';
    creatorSeekingData.unshift(item);
  }
  sb.from('match_demands').insert({id:item.id,poster:myProfile.name,role:role==='brand'?'品牌方':'达人',platforms:platforms,budget:item.budget,description:title+' · '+desc,deal_status:'open'}).then(function(r){if(r.error)showLoadError(r.error);});
  track('match_demand_publish',{demand_type:role,platform:platforms[0]});
  renderMatch();
  toggleMatchForm();
  document.getElementById('matchTitle').value='';
  document.getElementById('matchDesc').value='';
  document.getElementById('matchBudget').value='';
  document.getElementById('matchTags').value='';
  addXP(30,'发布对接');fb.textContent='发布成功！+30XP';
  fb.style.color='var(--sage)';
  setTimeout(function(){fb.textContent='';},2000);
  showToast('对接需求已发布');
}

// ========================================
// EMOJI & IMAGE
// ========================================
var commonEmojis = "😀😂🤣😍🥰😘😜🤪😎🤩🥳😢😡👍👎🙏💪👏🤝✍️🔥⭐✨💫🎉🎊❤️🧡💛💚💙💜🤍💔💯✅❌⚠️🎵📱💻🖥️📸🎬🚀💡💰📝🗑️🔗📌📍🟢🔴🟡🟣🐱🐶🦊🐼🐨🦁🐸🙈🌍🌈☀️🌙⚡☕🍕🎂🏆🎯";
var emojiTarget = null;
function toggleEmojiPicker(targetId, e) {
  e.stopPropagation();
  var pk = document.getElementById("emojiPicker");
  if (emojiTarget === targetId && pk.style.display !== "none") { pk.style.display = "none"; return; }
  emojiTarget = targetId;
  if (!pk.children.length) {
    for (var i = 0; i < commonEmojis.length; i++) {
      var s = document.createElement("span");
      s.textContent = commonEmojis[i];
      (function(emoji){ s.onclick = function(){ insertEmoji(emoji); }; })(commonEmojis[i]);
      pk.appendChild(s);
    }
  }
  var rect = e.target.getBoundingClientRect();
  pk.style.top = Math.max(10, rect.top - 290) + "px";
  pk.style.left = Math.min(rect.left, window.innerWidth - 400) + "px";
  pk.style.display = "grid";
}
function insertEmoji(emoji) {
  var el = document.getElementById(emojiTarget);
  if (!el) return;
  var start = el.selectionStart || 0;
  var end = el.selectionEnd || 0;
  el.value = el.value.slice(0, start) + emoji + el.value.slice(end);
  el.focus();
  el.selectionStart = el.selectionEnd = start + emoji.length;
  document.getElementById("emojiPicker").style.display = "none";
}
document.addEventListener("click", function(e){
  if (!e.target.closest(".emoji-picker") && !e.target.closest(".emoji-btn")) {
    document.getElementById("emojiPicker").style.display = "none";
    emojiTarget = null;
  }
});
function handleImageUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { showToast("图片不能超过5MB"); return; }
  showToast("图片已选择（前端演示模式）");
}

// ========================================
// UTILS
// ========================================
function safeArray(v){return Array.isArray(v)?v:[];}
function skeletonCards(n){var out='';for(var i=0;i<n;i++)out+='<div class="skeleton"></div>';return out;}
function showLoadingSkeletons(){var p=document.getElementById('postGrid');if(p&&!p.children.length)p.innerHTML=skeletonCards(3);var r=document.getElementById('recruitGrid');if(r&&!r.children.length)r.innerHTML=skeletonCards(3);var f=document.getElementById('friendsList');if(f&&!f.children.length)f.innerHTML=skeletonCards(3);}
var _lastLoadError=0;
function showLoadError(e){console.error(e);var now=Date.now();if(now-_lastLoadError>5000){_lastLoadError=now;showToast('加载失败，请刷新重试','error');}}
function showToast(m,type){var t=document.getElementById("toast");var kind=type||(/失败|错误|未找到/.test(m)?"error":/请|注意/.test(m)?"warn":"success");var icon=kind==="error"?"❌":kind==="warn"?"⚠️":"✅";t.className="toast "+kind;t.textContent=icon+" "+m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove("show");},2400);}

function showModal(opts){var el=document.getElementById('genericModal');if(!el){el=document.createElement('div');el.id='genericModal';el.className='msg-dialog';el.onclick=function(e){if(e.target===el)closeModal();};document.body.appendChild(el);}var actions=(opts.actions||[]).map(function(a){return '<button class="'+(a.cls||'btn')+'" onclick="'+a.onclick+'">'+escapeHtml(a.text)+'</button>';}).join(' ');el.innerHTML='<div class="msg-dialog-card"><h3>'+escapeHtml(opts.title||'')+'</h3><div>'+opts.body+'</div><div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;">'+actions+'<button class="btn secondary" onclick="closeModal()">取消</button></div></div>';el.style.display='flex';}
function closeModal(){var el=document.getElementById('genericModal');if(el)el.style.display='none';}

var PLATFORM_OPTIONS=[
  {id:'xhs',name:'小红书',pattern:/xiaohongshu\.com|xhslink\.com/},
  {id:'douyin',name:'抖音',pattern:/douyin\.com\/user/},
  {id:'bilibili',name:'B站',pattern:/bilibili\.com\/space/},
  {id:'kuaishou',name:'快手',pattern:/kuaishou\.com\/profile/},
  {id:'weibo',name:'微博',pattern:/weibo\.com\/u/},
  {id:'youtube',name:'YouTube',pattern:/youtube\.com\/@|youtube\.com\/channel/},
  {id:'tiktok',name:'TikTok',pattern:/tiktok\.com\/@/},
  {id:'wechat',name:'视频号',pattern:/channels\.weixin/}
];
function platformName(id){var opt=PLATFORM_OPTIONS.find(function(p){return p.id===id;});return opt?opt.name:id;}
function showConnectPlatform(){var options=PLATFORM_OPTIONS.map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('');showModal({title:'连接平台账号',body:'<div class="form-row"><label>选择平台</label><select id="connectPlatform">'+options+'</select></div><div class="form-row"><label>主页链接</label><input id="connectUrl" placeholder="https://..." /></div><div class="form-row"><label>粉丝数</label><input id="connectFollowers" type="number" placeholder="如: 23000" /></div><p style="font-size:12px;color:rgba(45,45,45,.5);">输入你的平台公开主页链接，我们会校验格式</p><p style="font-size:12px;color:var(--sage);">✅ 数据仅作参考，品牌方可查看你的主页核实</p>',actions:[{text:'连接',cls:'btn',onclick:'doConnectPlatform()'}]});}
function doConnectPlatform(){var platform=document.getElementById('connectPlatform').value;var url=document.getElementById('connectUrl').value.trim();var followers=parseInt(document.getElementById('connectFollowers').value)||0;if(!url){showToast('请输入主页链接','error');return;}var opt=PLATFORM_OPTIONS.find(function(p){return p.id===platform;});if(!opt.pattern.test(url)){showToast('链接格式不正确，请检查','error');return;}myProfile.connectedPlatforms=safeArray(myProfile.connectedPlatforms);var existing=myProfile.connectedPlatforms.findIndex(function(p){return p.platform===platform;});var entry={platform:platform,url:url,followers:followers,verified_at:new Date().toISOString()};if(existing>=0)myProfile.connectedPlatforms[existing]=entry;else myProfile.connectedPlatforms.push(entry);saveProfileField('connected_platforms',myProfile.connectedPlatforms);renderConnectedPlatforms();closeModal();showToast('平台已连接！','success');}
function renderConnectedPlatforms(){var list=document.getElementById('connectedPlatformsList');if(!list)return;var platforms=safeArray(myProfile.connectedPlatforms);if(!platforms.length){list.innerHTML='<p style="color:rgba(45,45,45,.4);font-size:14px;">还没有连接任何平台</p>';return;}list.innerHTML=platforms.map(function(p){var fans=p.followers?(p.followers>=10000?(p.followers/10000).toFixed(1)+'万粉':p.followers+'粉'):'已连接';return '<div class="connected-platform-chip"><span>'+escapeHtml(platformName(p.platform))+' · '+escapeHtml(fans)+' ✅</span><button class="mini-btn reject" data-disconnect-platform="'+escapeHtml(p.platform)+'">✕</button></div>';}).join('');}
document.addEventListener('click',function(e){var btn=e.target.closest('[data-disconnect-platform]');if(btn)disconnectPlatform(btn.dataset.disconnectPlatform);});
function disconnectPlatform(platform){myProfile.connectedPlatforms=safeArray(myProfile.connectedPlatforms).filter(function(p){return p.platform!==platform;});saveProfileField('connected_platforms',myProfile.connectedPlatforms);renderConnectedPlatforms();showToast('已断开连接','success');}
function saveProfileField(field,value){var update={};update[field]=value;sb.from('profiles').update(update).eq('username',currentUser).then(function(r){if(r.error)showLoadError(r.error);});}

var _reviewRatings={};
function showReviewDialog(dealId,reviewee,role){_reviewRatings={};var dimensions=role==='brand_review_creator'?['内容质量','沟通效率','专业度','数据表现']:['需求清晰度','付款及时性','合作体验'];var dimKeys=role==='brand_review_creator'?['content_quality','communication','professionalism','data_performance']:['brief_clarity','payment_timeliness','cooperation_experience'];var starsHtml=dimensions.map(function(d,i){return '<div class="form-row"><label>'+d+'</label><div class="star-row" data-dim="'+dimKeys[i]+'">'+[1,2,3,4,5].map(function(s){return '<button class="star" data-val="'+s+'" onclick="setStar(this,\''+dimKeys[i]+'\','+s+')" type="button">☆</button>';}).join('')+'</div></div>';}).join('');showModal({title:'评价合作',body:starsHtml+'<div class="form-row"><label>评价（选填）</label><textarea id="reviewComment" rows="3" placeholder="分享你的合作体验..."></textarea></div>',actions:[{text:'提交评价',cls:'btn',onclick:'submitReview(decodeURIComponent(\''+encodeURIComponent(dealId)+'\'),decodeURIComponent(\''+encodeURIComponent(reviewee)+'\'),decodeURIComponent(\''+encodeURIComponent(role)+'\'))'}]});}
function setStar(el,dim,val){_reviewRatings[dim]=val;var row=el.parentElement;row.querySelectorAll('.star').forEach(function(s,i){s.textContent=i<val?'★':'☆';s.classList.toggle('selected',i<val);});}
async function submitReview(dealId,reviewee,role){var ratings={};var dimKeys=role==='brand_review_creator'?['content_quality','communication','professionalism','data_performance']:['brief_clarity','payment_timeliness','cooperation_experience'];for(var i=0;i<dimKeys.length;i++){if(!_reviewRatings[dimKeys[i]]){showToast('请给所有维度评分','error');return;}ratings[dimKeys[i]]=_reviewRatings[dimKeys[i]];}var comment=document.getElementById('reviewComment')?document.getElementById('reviewComment').value.trim():'';var gate=await sb.rpc('can_review',{p_reviewer:currentUser,p_reviewee:reviewee,p_deal_id:dealId});if(gate.error){showToast('评价条件检查失败','error');return;}if(!gate.data){showToast('不满足评价条件（需要至少5条聊天记录且未评价过）','error');return;}var res=await sb.from('reviews').insert({deal_id:dealId,reviewer:currentUser,reviewee:reviewee,role:role,ratings:ratings,comment:comment});if(res.error){showToast('评价失败: '+res.error.message,'error');return;}await sb.rpc('calc_trust_score',{p_username:reviewee}).then(function(r){if(r.data!=null)sb.from('profiles').update({trust_score:r.data}).eq('username',reviewee).then(function(){});});closeModal();showToast('评价成功！','success');_reviewRatings={};renderProfileReviews();}
function ensureProfileReviewsMount(){var el=document.getElementById('profileReviews');if(el)return el;var home=document.getElementById('profileHome');if(!home)return null;var firstSection=home.querySelector('.profile-section');el=document.createElement('div');el.id='profileReviews';if(firstSection)home.insertBefore(el,firstSection);else home.appendChild(el);return el;}
function renderProfileReviews(){var mount=ensureProfileReviewsMount();if(!mount||!currentUser)return;mount.innerHTML='<div class="card profile-section review-summary"><h3>⭐ 合作评价</h3><p class="hint">正在加载最近评价...</p></div>';sb.from('reviews').select('*').eq('reviewee',currentUser).order('created_at',{ascending:false}).limit(10).then(function(r){if(r.error){mount.innerHTML='<div class="card profile-section review-summary"><h3>⭐ 合作评价</h3><p class="hint">评价加载失败，请稍后重试</p></div>';showLoadError(r.error);return;}var reviews=r.data||[];if(!reviews.length){mount.innerHTML='<div class="card profile-section review-summary"><h3>⭐ 合作评价</h3><p class="hint">还没有合作评价，完成一次对接后就会出现在这里</p></div>';return;}var avg=reviews.reduce(function(sum,rev){var vals=Object.values(rev.ratings||{});if(!vals.length)return sum;return sum+vals.reduce(function(a,b){return a+Number(b||0);},0)/vals.length;},0)/reviews.length;mount.innerHTML='<div class="card profile-section review-summary"><h3>⭐ '+avg.toFixed(1)+' ('+reviews.length+'次合作)</h3>'+reviews.slice(0,3).map(function(rev){return '<div class="review-item"><b>'+escapeHtml(rev.reviewer)+'</b><p>'+escapeHtml(rev.comment||'（无文字评价）')+'</p></div>';}).join('')+'</div>';});}
function captureInviteCode(){try{var code=new URLSearchParams(window.location.search).get('invite');if(code)sessionStorage.setItem('_invite_code',code);}catch(_){}}
async function showInviteDialog(){if(!currentUser){showToast('请先登录','warn');return;}var existing=await sb.from('invitation_codes').select('code').eq('inviter_username',currentUser).is('used_by',null).limit(1);var code=existing.data&&existing.data.length?existing.data[0].code:null;if(!code){code=generateInviteCode();var ins=await sb.from('invitation_codes').insert({code:code,inviter_username:currentUser});if(ins.error){code=generateInviteCode();await sb.from('invitation_codes').insert({code:code,inviter_username:currentUser});}}var base=location.origin&&location.origin!=='null'?location.origin+location.pathname:'https://creatorhub.vercel.app/';var link=base.replace(/\/index\.html$/,'/')+'?invite='+encodeURIComponent(code);showModal({title:'邀请朋友入驻',body:'<p style="text-align:center;font-size:15px;">分享这个链接给你的朋友</p><div class="invite-link-box">'+escapeHtml(link)+'</div><p style="font-size:12px;color:rgba(45,45,45,.5);text-align:center;">邀请奖励：注册 +50XP · 发帖 +30XP · 对接 +100XP</p>',actions:[{text:'📋 复制链接',cls:'btn',onclick:'copyInviteLink(decodeURIComponent(\''+encodeURIComponent(link)+'\'))'}]});}
function copyInviteLink(link){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(link).then(function(){showToast('链接已复制！','success');closeModal();}).catch(function(){showToast('复制失败，请手动复制','error');});}else{showToast('复制失败，请手动复制','error');}}
async function addXPForUser(username,amount,reason){await sb.from('xp_records').insert({username:username,amount:amount,reason:reason});var p=await sb.from('profiles').select('xp,level').eq('username',username).single();if(p.data){var newXP=(p.data.xp||0)+amount;var newLevel=Math.floor(newXP/100)+1;await sb.from('profiles').update({xp:newXP,level:newLevel}).eq('username',username);}}
async function processInviteCode(){var inviteCode=sessionStorage.getItem('_invite_code');if(!inviteCode||!currentUser)return;sessionStorage.removeItem('_invite_code');var r=await sb.from('invitation_codes').select('inviter_username,used_by').eq('code',inviteCode).single();if(!r.data||r.data.used_by||r.data.inviter_username===currentUser)return;var inviter=r.data.inviter_username;await sb.from('invitation_codes').update({used_by:currentUser,used_at:new Date().toISOString()}).eq('code',inviteCode);await sb.from('friends').insert({username:inviter,friend_name:currentUser}).then(function(){});await sb.from('friends').insert({username:currentUser,friend_name:inviter}).then(function(){});await addXPForUser(inviter,50,'邀请好友注册');await sb.from('notifications').insert({username:inviter,type:'好友',content:currentUser+' 通过你的邀请链接注册了！',from_user:currentUser});showToast('已通过邀请加入，双方已自动成为好友','success');}
function ensureInviteCard(){var settings=document.getElementById('profileSettings');if(!settings)return null;var el=document.getElementById('inviteProfileCard');if(el)return el;el=document.createElement('div');el.id='inviteProfileCard';el.className='card profile-section invite-card';el.innerHTML='<h3>👥 邀请朋友</h3><p class="hint" id="profileInviteCount">已邀请 0 人入驻</p><button class="btn green" onclick="showInviteDialog()">生成邀请链接</button>';var firstCard=settings.querySelector('.card.profile-section');if(firstCard)settings.insertBefore(el,firstCard);else settings.appendChild(el);return el;}
function renderInviteStats(){var card=ensureInviteCard();if(!card||!currentUser)return;sb.from('invitation_codes').select('used_by').eq('inviter_username',currentUser).not('used_by','is',null).then(function(r){var el=document.getElementById('profileInviteCount');if(el)el.textContent='已邀请 '+(r.data?r.data.length:0)+' 人入驻';});}

// ========================================
function initHomepage() {
  var bg = document.getElementById("floatingBg");
  if (bg && !bg.children.length) {
    var emojis = ["📱","🎬","✨","💡","🔥","🌟","📸","🎯","💬","🤝","📝","🎪"];
    for (var i=0;i<12;i++) {
      var s = document.createElement("span");
      s.className = "floating-emoji";
      s.textContent = emojis[i];
      s.style.left = Math.random()*90+"%";
      s.style.top = Math.random()*85+"%";
      s.style.animationDelay = Math.random()*6+"s";
      s.style.fontSize = (22+Math.random()*32)+"px";
      s.addEventListener("click",function(e){ e.stopPropagation(); burstSparks(e.clientX,e.clientY,this.textContent); });
      bg.appendChild(s);
    }
  }


  var wall = document.getElementById("platformWall");
  if (wall && !wall.children.length) {
    [{n:"小红书",e:"📕",c:"#FF2442"},{n:"抖音",e:"🎵",c:"#111"},{n:"B站",e:"📺",c:"#FB7299"},{n:"快手",e:"⚡",c:"#FF4906"},{n:"视频号",e:"💚",c:"#07C160"},{n:"YouTube",e:"▶️",c:"#FF0000"},{n:"TikTok",e:"🎵",c:"#00F2EA"},{n:"Instagram",e:"📷",c:"#E1306C"},{n:"微博",e:"📢",c:"#E6162D"},{n:"知乎",e:"💡",c:"#0066FF"},{n:"得物",e:"👟",c:"#222"},{n:"淘宝",e:"🛒",c:"#FF5000"}].forEach(function(p,i){
      var chip = document.createElement("span");
      chip.className = "platform-chip";
      chip.style.background = p.c;
      chip.style.animationDelay = (i*0.06)+"s";
      chip.innerHTML = p.e+" "+p.n;
      chip.title = p.n;
      chip.addEventListener("click",function(e){ burstSparks(e.clientX,e.clientY,p.e); showToast("🔗 "+p.n+" — 不限平台"); });
      wall.appendChild(chip);
    });
  }

  document.querySelectorAll(".home-stat-item .num").forEach(function(el){
    var t = parseInt(el.dataset.count);
    if(!t||el._counted)return;
    el._counted=true;el.textContent="0";
    var start=performance.now();
    function tick(now){
      var p=Math.min((now-start)/1400,1);
      el.textContent=Math.floor((1-Math.pow(1-p,3))*t).toLocaleString();
      if(p<1)requestAnimationFrame(tick);
      else el.textContent=t.toLocaleString();
    }
    requestAnimationFrame(tick);
  });

  var row=document.getElementById("onlineRow");
  if(row&&!row.children.length){
    var online=allUsers.filter(function(u){return u.online;}).slice(0,8);
    row.innerHTML='<span style="font-size:15px;color:rgba(45,45,45,.5);margin-right:4px;">🟢 在线：</span>'+online.map(function(u){
      return '<span class="online-chip" onclick="switchTab(\'friends\');setTimeout(function(){showFriendProfile(\''+u.id+'\');},300)">'+escapeHtml(u.name)+'</span>';
    }).join("");
  }

  document.querySelectorAll(".home-feat-card,.home-path-card,.home-stats-bar").forEach(function(el){
    if(el._revealed)return;
    el._revealed=true;
    el.classList.add("anim-fade-up");
    if(el.getBoundingClientRect().top<window.innerHeight)el.classList.add("show");
  });
  if(!window._scrollReveal){
    window._scrollReveal=true;
    window.addEventListener("scroll",function(){
      document.querySelectorAll(".anim-fade-up").forEach(function(el){
        if(el.getBoundingClientRect().top<window.innerHeight-60)el.classList.add("show");
      });
    },{passive:true});
  }
}

function burstSparks(cx,cy,emoji){
  for(var i=0;i<12;i++){
    var s=document.createElement("span");
    s.style.cssText="position:fixed;z-index:999;pointer-events:none;left:"+cx+"px;top:"+cy+"px;font-size:"+(14+Math.random()*16)+"px;";
    s.textContent=["✨","💫","⭐","🌟","💥","🔥","💖","🎉"][Math.floor(Math.random()*8)];
    var a=(Math.PI*2*i)/12,d=40+Math.random()*70;
    s.animate([{opacity:1,transform:"translate(0,0) scale(1)"},{opacity:0,transform:"translate("+Math.cos(a)*d+"px,"+Math.sin(a)*d+"px) scale(0)"}],{duration:500+Math.random()*300,easing:"ease-out"});
    setTimeout(function(){s.remove();},900);
  }
}

function burstConfetti(e){
  burstSparks(e.clientX,e.clientY,"🎉");
  setTimeout(function(){burstSparks(e.clientX,e.clientY,"🌟");},150);
  showToast("🎉 欢迎来到 CreatorHub！");
}

function pickPath(role){
  var labels={creator:"创作者 / 达人",brand:"品牌方",merchant:"商家 / 供应链"};
  myProfile.role=role;
  myProfile.roleLabel=labels[role];
  document.getElementById("setRole").value=role;
  burstConfetti({clientX:window.innerWidth/2,clientY:window.innerHeight/2});
  setTimeout(function(){showToast("身份已切换："+labels[role]);switchTab("match");},500);
}

var _currentTab='home';
function switchTab(tab) {
  ensureDealsUI();
  if(tab!==_currentTab){track('page_view',{page_name:tab,previous_page:_currentTab});_currentTab=tab;}
  document.querySelectorAll('.section-panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('panel-' + tab).classList.add('active');
  var btn = document.querySelector('[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');
  if (tab === 'chat') renderChatContacts();
  if (tab === 'recruit') renderRecruits();
  if (tab === 'match') renderMatch();
  if (tab === 'local') renderLocalMatch();
  if (tab === 'community') renderPosts();
  if (tab === 'square') renderFeed();
  if (tab === 'friends') renderFriendsList();
  if (tab === 'deals') renderMyDeals();
  if (tab === 'profile') renderProfile();
  if (tab === 'home') initHomepage();
  closeDrawer();
}

document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ switchTab(btn.dataset.tab); });
});

function ensureDealsUI(){var nav=document.getElementById('tabNav');if(nav&&!document.querySelector('[data-tab="deals"]')){var btn=document.createElement('button');btn.className='tab-btn';btn.dataset.tab='deals';btn.textContent='📋 我的对接';btn.addEventListener('click',function(){switchTab('deals');});nav.insertBefore(btn,document.querySelector('[data-tab="friends"]')||null);}if(!document.getElementById('panel-deals')){var panel=document.createElement('section');panel.className='section-panel';panel.id='panel-deals';panel.innerHTML='<div class="panel-header section-head"><div><span class="sticky-label">交易闭环</span><h2 class="section-title">📋 我的对接</h2></div></div><div id="myDealsGrid" class="my-deals-grid"></div>';var profile=document.getElementById('panel-profile');if(profile&&profile.parentNode)profile.parentNode.insertBefore(panel,profile);else document.getElementById('mainApp').appendChild(panel);}}
function normalizeDealItem(d,type){var isBrand=type==='brand';return {id:d.id,title:d.title||d.description||'对接需求',poster:isBrand?(d.brand||d.poster):(d.creator||d.poster),role:isBrand?'品牌方':'达人',platforms:safeArray(d.platforms),budget:d.budget||'面议',description:d.desc||d.description||d.detail||'',deal_status:d.deal_status||'open',deal_partner:d.deal_partner||'',source:d};}
function mergeMatchDemandRow(d){var isBrand=d.role==='品牌方'||d.role==='brand';var arr=isBrand?brandSeekingData:creatorSeekingData;if(arr.find(function(x){return x.id===d.id;}))return;var item={id:d.id,title:(d.description||'对接需求').split(' · ')[0],budget:d.budget||'面议',desc:d.description||'',detail:d.description||'',platforms:safeArray(d.platforms),tags:['对接'],deal_status:d.deal_status||'open',deal_partner:d.deal_partner||''};if(isBrand){item.brand=d.poster;item.avatar=(d.poster||'品').slice(0,1);item.avatarBg='';}else{item.creator=d.poster;item.avatar=(d.poster||'达').slice(0,1);item.avatarBg='';}arr.unshift(item);}
function getMatchDemands(){return brandSeekingData.map(function(d){return normalizeDealItem(d,'brand');}).concat(creatorSeekingData.map(function(d){return normalizeDealItem(d,'creator');}));}
function updateDealLocal(dealId,fields){[brandSeekingData,creatorSeekingData].forEach(function(arr){var d=arr.find(function(x){return x.id===dealId;});if(d)Object.keys(fields).forEach(function(k){d[k]=fields[k];});});}
function relatedDealForActiveContact(){if(!activeContact||activeContact.id==='world')return null;var name=activeContact.name;return getMatchDemands().find(function(d){return (d.poster===currentUser&&d.deal_partner===name)||(d.poster===name&&d.deal_partner===currentUser)||(d.poster===name&&d.deal_status==='open')||(d.poster===currentUser&&name&&d.deal_status==='open');})||null;}
function dealStatusLabel(status){return {open:'📋 待对接',negotiating:'💬 洽谈中',active:'🤝 合作中',completed:'✅ 已完成',cancelled:'❌ 已取消'}[status]||status||'待对接';}
function dealStatusColor(status){return {open:'var(--blue)',negotiating:'var(--orange)',active:'var(--sage)',completed:'var(--muted)',cancelled:'var(--red)'}[status]||'var(--gray)';}
function dealBarHtml(){var d=relatedDealForActiveContact();if(!d)return '';var partner=activeContact.name;var html='<div class="deal-bar" style="background:'+dealStatusColor(d.deal_status)+'"><span>'+escapeHtml(d.title)+' · '+dealStatusLabel(d.deal_status)+'</span><span class="deal-actions">';if(d.deal_status==='open'||d.deal_status==='negotiating')html+='<button class="btn" onclick="confirmDealAction(decodeURIComponent(\''+encodeURIComponent(d.id)+'\'),decodeURIComponent(\''+encodeURIComponent(partner)+'\'))">确认合作</button>';if(d.deal_status==='active')html+='<button class="btn" onclick="completeDealAction(decodeURIComponent(\''+encodeURIComponent(d.id)+'\'))">标记完成</button>';if(d.deal_status==='completed')html+='<button class="btn" onclick="showReviewDialog(decodeURIComponent(\''+encodeURIComponent(d.id)+'\'),decodeURIComponent(\''+encodeURIComponent(partner)+'\'),\'brand_review_creator\')">评价</button>';return html+'</span></div>';}
async function confirmDealAction(dealId,partner){var r=await sb.rpc('confirm_deal',{p_deal_id:dealId,p_partner:partner});if(r.error){showToast('操作失败','error');return;}if(r.data==='ok'){updateDealLocal(dealId,{deal_status:'active',deal_partner:partner});showToast('合作已确认！','success');renderChatMessages();renderMyDeals();}else{showToast('操作失败: '+r.data,'error');}}
async function completeDealAction(dealId){var r=await sb.rpc('complete_deal',{p_deal_id:dealId});if(r.error){showToast('操作失败','error');return;}updateDealLocal(dealId,{deal_status:'completed'});showToast('合作已完成！请评价对方','success');renderChatMessages();renderMyDeals();}
function openDealChat(partner){if(!partner||partner==='—')return;var contact=contacts.find(function(c){return c.name===partner||c.id==='f_'+partner;});if(!contact){contact={id:'f_'+partner,name:partner,avatar:partner.slice(0,1),avatarBg:avatarGradient(partner),platform:'all',unread:0,lastMsg:'开始对接沟通',messages:[]};contacts.push(contact);}switchTab('chat');selectContact(contact.id);}
function renderMyDeals(){ensureDealsUI();if(!currentUser)return;var grid=document.getElementById('myDealsGrid');if(!grid)return;var myDeals=getMatchDemands().filter(function(d){return d.poster===currentUser||d.deal_partner===currentUser;});if(!myDeals.length){grid.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><p>还没有对接记录</p><p class="hint">去对接广场看看有没有合适的需求吧</p></div>';return;}var statusOrder={active:0,negotiating:1,open:2,completed:3,cancelled:4};myDeals.sort(function(a,b){return (statusOrder[a.deal_status]||9)-(statusOrder[b.deal_status]||9);});grid.innerHTML=myDeals.map(function(d,i){var isMine=d.poster===currentUser;var partner=isMine?(d.deal_partner||'—'):d.poster;var role=isMine?'brand_review_creator':'creator_review_brand';return '<article class="card deal-card" style="--tilt:'+randTilt(i)+';--tape:'+randTape(i)+'" onclick="openDealChat(decodeURIComponent(\''+encodeURIComponent(partner)+'\'))"><div class="card-top"><span>🤝 '+escapeHtml(isMine?'我发布的':'我参与的')+'</span><span class="card-status" style="background:'+dealStatusColor(d.deal_status)+'">'+dealStatusLabel(d.deal_status)+'</span></div><h3>'+escapeHtml(d.title)+'</h3><p class="desc">'+escapeHtml(d.description)+'</p><p style="color:rgba(45,45,45,.55);">对方：'+escapeHtml(partner)+'</p>'+(d.deal_status==='completed'?'<button class="btn" onclick="event.stopPropagation();showReviewDialog(decodeURIComponent(\''+encodeURIComponent(d.id)+'\'),decodeURIComponent(\''+encodeURIComponent(partner)+'\'),\''+role+'\')">⭐ 评价</button>':'')+'</article>';}).join('');}

// ========================================
// FEED (Square)
// ========================================
function feedCardClick(type) {
  var tabMap = { recruit:'recruit', match:'match', post:'community', chat:'chat' };
  var tab = tabMap[type] || 'community';
  switchTab(tab);
}

function renderFeed() {
  const items = [
    { type: 'recruit', typeLabel: '招募', cls: 'recruit', title: '花漾美妆品牌急招小红书美妆达人', meta: '预算 ¥5,000-15,000/条 · 刚刚' },
    { type: 'match', typeLabel: '对接', cls: 'match', title: '穿搭师Nina(10w粉) 开放服饰品牌合作', meta: '期望 ¥5,000+/条 · 12分钟前' },
    { type: 'post', typeLabel: '帖子', cls: 'post', title: '小红书笔记限流的10个自查方法', meta: '运营老司机 · 238赞 · 2小时前' },
    { type: 'chat', typeLabel: '动态', cls: 'chat', title: '美妆达人小A 与 品牌方达成合作意向', meta: '通过本平台对接 · 30分钟前' },
    { type: 'post', typeLabel: '帖子', cls: 'post', title: '从0到10w粉——抖音知识类账号一年复盘', meta: '知识博主小李 · 412赞 · 5小时前' },
    { type: 'recruit', typeLabel: '招募', cls: 'recruit', title: '星辰MCN招募全平台短视频编导', meta: '月薪 ¥15K-25K · 1小时前' },
    { type: 'match', typeLabel: '对接', cls: 'match', title: '运动品牌跃动体育找抖音+快手带货主播', meta: '¥10,000-50,000/场 · 2小时前' },
    { type: 'post', typeLabel: '帖子', cls: 'post', title: '品牌方找达人合作的5个坑，我都踩过了', meta: '品牌主理人阿Jay · 327赞 · 昨天' },
  ];
  document.getElementById('feedGrid').innerHTML = items.map((item, i) => `
    <article class="feed-card" style="--tilt:${randTilt(i)};cursor:pointer;" onclick="feedCardClick('${item.type}')">
      <span class="feed-type ${item.cls}">${item.typeLabel}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <div class="feed-meta">${escapeHtml(item.meta)}</div>
    </article>
  `).join('');
}

// ========================================
// CHAT
// ========================================
let activeContact = null;

// World chat messages
var worldChat = [
  { from:'系统', text:'欢迎来到 CreatorHub 世界频道！🎉 在这里大家可以自由交流', time:'08:00' },
  { from:'美妆达人小A', text:'大家好！刚入驻，有没有做小红书美妆的朋友呀', time:'09:15' },
  { from:'数码品牌方老张', text:'我们在找抖音科技类主播，有意向的朋友可以看看招募页', time:'09:30' },
  { from:'B站UP主小王', text:'有人在做B站科技内容吗？想交流一下选题经验', time:'10:00' },
  { from:'穿搭师Nina', text:'刚发了一个穿搭合作需求在对接页，欢迎品牌方来聊 🙌', time:'10:20' },
];

function renderChatContacts() {
  const list = document.getElementById('chatContactList');
  var isWorldActive = activeContact && activeContact.id === 'world';
  var lastMsg = worldChat.length > 0 ? worldChat[worldChat.length-1] : null;
  list.innerHTML = `
    <div class="chat-contact world-channel${isWorldActive ? ' active' : ''}" onclick="selectWorldChat()">
      <span class="avatar" style="background:linear-gradient(135deg,#ff9a9e,#fad0c4,#fad0c4,#ffd1ff,#a18cd1);font-size:24px;">🌍</span>
      <div class="chat-contact-info">
        <div class="name" style="color:var(--red);font-weight:700;">世界频道</div>
        <div class="last-msg">${lastMsg ? escapeHtml(lastMsg.from + '：' + lastMsg.text.slice(0,20)) : '暂无消息'}</div>
      </div>
      <span style="font-size:12px;color:var(--sage);">${worldChat.length}条</span>
    </div>
  ` + contacts.map(c => `
    <div class="chat-contact${activeContact && activeContact.id === c.id ? ' active' : ''}" data-contact-id="${escapeHtml(c.id)}">
      <span class="avatar" style="${avatarStyle(c.name)}">${escapeHtml(c.avatar)}</span>
      <div class="chat-contact-info">
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="last-msg">${escapeHtml(c.lastMsg)}</div>
      </div>
      ${c.unread > 0 ? `<span class="badge">${c.unread}</span>` : ''}
    </div>
  `).join('');
}
document.getElementById('chatContactList').addEventListener('click', function(e) {
  var contact = e.target.closest('[data-contact-id]');
  if (!contact) return;
  selectContact(contact.dataset.contactId);
});

function selectWorldChat() {
  activeContact = { id:'world', name:'世界频道', avatar:'🌍' };
  renderChatContacts();
  document.getElementById('chatAvatar').textContent = '🌍';
  document.getElementById('chatAvatar').style.background = 'linear-gradient(135deg,#ff9a9e,#fad0c4,#a18cd1)';
  document.getElementById('chatName').textContent = '世界频道';
  document.getElementById('chatPlatformTag').innerHTML = '<span style="font-size:13px;color:var(--red);">🔥 在线</span>';
  renderWorldChat();
}

function renderWorldChat() {
  var container = document.getElementById('chatMessages');
  container.innerHTML = worldChat.map(function(m){
    var isMe = m.from === myProfile.name;
    var avatarLetter = m.from === '系统' ? '🤖' : m.from.slice(0,1);
    return '<div class="msg-bubble ' + (isMe ? 'mine' : 'theirs') + '" style="max-width:80%;">' +
      '<div style="font-size:12px;color:rgba(45,45,45,.5);margin-bottom:2px;">' +
      (isMe ? '' : '<span style="font-weight:700;">' + escapeHtml(m.from) + '</span> · ') + m.time +
      '</div>' + escapeHtml(m.text) + '</div>';
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function sendWorldMessage() {
  var input = document.getElementById('chatInput');
  var text = input.value.trim();
  if (!text) return;
  var now = new Date();
  var time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  worldChat.push({ from:myProfile.name, text:text, time:time });sb.from("world_messages").insert({sender:myProfile.name,sender_avatar:myProfile.avatar,content:text}).then(function(){});
  input.value = '';
  track('chat_message_send',{chat_type:'world'});
  renderWorldChat();
  renderChatContacts();
  // Simulate random reply
  var replies = ['同意！','有道理 👍','欢迎欢迎 🎉','+1','这个方向不错','支持一下','哈哈','学到了'];
  setTimeout(function(){
    var r = replies[Math.floor(Math.random()*replies.length)];
    var rt = String(new Date().getHours()).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
    worldChat.push({ from:allUsers[Math.floor(Math.random()*allUsers.length)].name, text:r, time:rt });
    if (activeContact && activeContact.id === 'world') renderWorldChat();
    renderChatContacts();
  }, 1500 + Math.random()*2000);
}

function selectContact(id) {
  activeContact = contacts.find(c => c.id === id);
  if (!activeContact) return;
  // Clear unread
  activeContact.unread = 0;
  updateChatBadge();
  renderChatContacts();

  // Update chat header
  document.getElementById('chatAvatar').textContent = activeContact.avatar;
  document.getElementById('chatAvatar').style.background = activeContact.avatarBg ? '' : 'var(--avatar)';
  document.getElementById('chatName').textContent = activeContact.name;
  const platformTag = document.getElementById('chatPlatformTag');
  if (activeContact.platform !== 'all') {
    platformTag.innerHTML = platformTagHtml(activeContact.platform);
  } else {
    platformTag.innerHTML = '';
  }

  // Render messages
  renderChatMessages();
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  if (!activeContact) {
    container.innerHTML = '<p style="color:rgba(45,45,45,.4);text-align:center;margin-top:60px;">👈 左边选一个人开始聊天</p>';
    return;
  }
  container.innerHTML = dealBarHtml() + activeContact.messages.map(m => `
    <div class="msg-bubble ${m.from === 'me' ? 'mine' : 'theirs'}">
      ${escapeHtml(m.text)}
      <div class="msg-time">${m.time}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

var _lastChatXP = 0;

// Notification delivery — sends message to target's chat contacts AND notification bell
function deliverNotification(targetName, msgText, source) {
  if(!targetName||targetName===myProfile.name)return;
  var now=new Date();var time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  // Add to sender's contacts so they can track the conversation
  var cid='f_'+targetName;
  var existing=contacts.find(function(c){return c.id===cid||c.name===targetName;});
  if(existing){
    existing.messages.push({from:'me',text:msgText,time:time});
    existing.lastMsg='我：'+msgText.slice(0,30);
  }else{
    contacts.push({id:cid,name:targetName,avatar:targetName.slice(0,1),avatarBg:avatarGradient(targetName),platform:'all',unread:0,lastMsg:'我：'+msgText.slice(0,30),messages:[{from:'me',text:msgText,time:time}]});
  }
  // Store cross-session notification for target
  try{
    var notifs=JSON.parse(localStorage.getItem('creatorhub_notifications')||'{}');
    if(!notifs[targetName])notifs[targetName]=[];
    notifs[targetName].push({from:myProfile.name,text:msgText,source:source,time:Date.now(),read:false});
    localStorage.setItem('creatorhub_notifications',JSON.stringify(notifs));
sb.from("notifications").insert({username:targetName,type:source||"系统",content:msgText,from_user:myProfile.name,link:""}).then(function(){});
  }catch(_){}
  renderChatContacts();
}

// Check unread notifications for current user on login
async function checkOnboarding(){if(currentUser&&!localStorage.getItem('creatorhub_onboarding_'+currentUser)){showOnboarding();}}
async function checkNotifications(){ if(currentUser){ var list=await loadNotifications(); if(list.length>0){ var lastSeen=localStorage.getItem('creatorhub_notify_last_seen')||''; list.forEach(function(n){ if(n.created_at>lastSeen){ saveNotify(emoFor(n.type),n.from_user+' → '+n.content.slice(0,30),n.content,actFor(n.type)); } }); } updateNotifyBadge(); } }

// Notification center — parallel to chat notifications, for the bell dropdown
var _seenNotifs = JSON.parse(sessionStorage.getItem('_seen_notifs') || '{}');
function saveNotify(emoji, title, body, action) {
  var now = Date.now();
  Object.keys(_seenNotifs).forEach(function(k){ if(now - _seenNotifs[k] > 10000) delete _seenNotifs[k]; });
  var key = title + '|' + body + '|' + (action || '');
  if (_seenNotifs[key]) { sessionStorage.setItem('_seen_notifs', JSON.stringify(_seenNotifs)); return; }
  _seenNotifs[key] = now;
  sessionStorage.setItem('_seen_notifs', JSON.stringify(_seenNotifs));
  var list = JSON.parse(localStorage.getItem('creatorhub_notify_list') || '[]');
  list.unshift({ emoji: emoji, title: title, body: body, action: action, time: Date.now(), read: false });
  if (list.length > 100) list.splice(100);
  localStorage.setItem('creatorhub_notify_list', JSON.stringify(list));
  updateNotifyBadge();
}
function updateNotifyBadge() {
  var list = JSON.parse(localStorage.getItem('creatorhub_notify_list') || '[]');
  var unread = list.filter(function(n) { return !n.read; }).length;
  var badge = document.getElementById('notifyBadge');
  if (badge) { badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = unread > 0 ? '' : 'none'; }
}
function toggleNotifyDropdown(e) {
  e.stopPropagation();
  var dd = document.getElementById('notifyDropdown');
  if (dd.style.display === 'none') { renderNotifications(); dd.style.display = ''; } else { dd.style.display = 'none'; }
}
document.addEventListener('click', function() { var dd = document.getElementById('notifyDropdown'); if (dd) dd.style.display = 'none'; });
function renderNotifications() {
  var list = JSON.parse(localStorage.getItem('creatorhub_notify_list') || '[]');
  var container = document.getElementById('notifyList');
  if (!list.length) { container.innerHTML = '<p style="color:rgba(45,45,45,.4);text-align:center;padding:20px;">暂无消息</p>'; return; }
  container.innerHTML = list.map(function(n) {
    var t = new Date(n.time); var timeStr = t.getMonth()+1+'/'+t.getDate()+' '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    return '<div class="notify-item'+(n.read?'':' unread')+'" data-notify-index="'+String(list.indexOf(n))+'" data-notify-action="'+escapeHtml(n.action||'')+'"><span class="notify-emoji">'+escapeHtml(n.emoji)+'</span><div class="notify-body"><b>'+escapeHtml(n.title)+'</b><p>'+escapeHtml(n.body)+'</p></div><span class="notify-time">'+escapeHtml(timeStr)+'</span></div>';
  }).join('');
  // Mark all as read in UI
  list.forEach(function(n) { n.read = true; });
  localStorage.setItem('creatorhub_notify_list', JSON.stringify(list));
  updateNotifyBadge();
}
function handleNotifyClick(idx, action) {
  document.getElementById('notifyDropdown').style.display = 'none';
  if (action && action.indexOf('chat:') === 0) { var uid = action.slice(5); chatWithFriend(uid); return; }
  if (action === 'friends') { switchTab('friends'); return; }
  if (action === 'match') { switchTab('match'); return; }
  if (action === 'recruit') { switchTab('recruit'); return; }
  if (action === 'local') { switchTab('local'); return; }
  if (action === 'community') { switchTab('community'); return; }
}
function clearAllNotifications() {
  localStorage.setItem('creatorhub_notify_list', '[]');
  renderNotifications(); updateNotifyBadge();
}
document.getElementById('notifyList').addEventListener('click', function(e) {
  var item = e.target.closest('.notify-item');
  if (!item) return;
  handleNotifyClick(item.dataset.notifyIndex, item.dataset.notifyAction || '');
});

function sendMessage() {
  if (activeContact && activeContact.id === 'world') { sendWorldMessage(); return; }
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !activeContact) return;

  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  activeContact.messages.push({ from: 'me', text, time });sb.from("chat_messages").insert({sender:myProfile.name,recipient:activeContact.name||activeContact.id,content:text}).then(function(){});
  activeContact.lastMsg = text;
  input.value = '';
  track('chat_message_send',{chat_type:'private',target_user:activeContact.name||activeContact.id});
  // XP for chat (cooldown 60s)
  var now2 = Date.now();
  if (now2 - _lastChatXP > 60000) { _lastChatXP = now2; addXP(5, '聊天发言'); }
  renderChatMessages();
  renderChatContacts();

  // Simulate reply after 1-2 seconds
  const replies = [
    '好的，收到！',
    '这个想法不错，我们可以深入聊聊',
    '有道理，我考虑一下再回复你',
    '可以啊，具体细节我们可以视频会议聊',
    '没问题，我这边安排一下时间',
    '感谢！期待合作 🤝'
  ];
  setTimeout(() => {
    const reply = replies[Math.floor(Math.random() * replies.length)];
    activeContact.messages.push({ from: 'them', text: reply, time: new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0') });
    activeContact.lastMsg = reply;
    activeContact.unread = (activeContact.unread || 0) + 1;
    updateChatBadge();
    if (activeContact && document.getElementById('panel-chat').classList.contains('active')) {
      renderChatMessages();
      renderChatContacts();
      // auto-clear in-chat unread
      activeContact.unread = 0;
      updateChatBadge();
      renderChatContacts();
    }
  }, 1000 + Math.random() * 2000);
}

function updateChatBadge() {
  const total = contacts.reduce((s, c) => s + (c.unread || 0), 0);
  const badge = document.getElementById('chatBadge');
  badge.textContent = total;
  badge.style.display = total > 0 ? '' : 'none';
}

// Enter key = send message
document.getElementById('chatInput').addEventListener('keydown', function(e){
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
// Enter key = send world message or private message
document.addEventListener('keydown', function(e){
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === document.getElementById('chatInput')) {
    // handled above
  }
  // Enter in comment input
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === document.getElementById('commentInput')) {
    e.preventDefault(); addComment();
  }
  // Enter in match message textarea (Ctrl+Enter to send)
  if (e.key === 'Enter' && e.ctrlKey && document.activeElement === document.getElementById('msgDialogInput')) {
    e.preventDefault(); sendMatchMsg();
  }
  // Escape closes dialogs
  if (e.key === 'Escape') {
    closeDrawer();
    closeMatchMsg();
  }
});

// Mobile: wrap topbar on small screens
function handleTopbarWrap(){
  var tb = document.querySelector('.topbar');
  if (window.innerWidth < 750) tb.style.flexWrap = 'wrap';
  else tb.style.flexWrap = 'nowrap';
}
window.addEventListener('resize', handleTopbarWrap);
handleTopbarWrap();

// ========================================
// RECRUIT
// ========================================
function renderRecruits(filter = 'all') {
  track('recruit_view',{filter:filter});
  let items = filter === 'all' ? recruits : recruits.filter(r => {
    var platforms = safeArray(r.platforms);
    if (['urgent','maker','merchant','tech'].includes(filter)) return r.type === filter || r.statusClass === filter;
    if (filter === 'all-plat') return platforms.length > 1;
    return platforms.includes(filter);
  });
  if(!items.length){document.getElementById('recruitGrid').innerHTML='<p class="empty-state">还没有招募，发布第一条招募吧</p>';return;}
  document.getElementById('recruitGrid').innerHTML = items.map((r, i) => {
    var platforms = safeArray(r.platforms);
    var tags = safeArray(r.tags);
    return `
    <article class="card" style="--tilt:${randTilt(i)};--tape:${randTape(i)}">
      <div class="card-top">
        <span class="card-status ${r.statusClass}">${r.status}</span>
        <span class="card-no">#${String(i+1).padStart(2,'0')}</span>
      </div>
      <h3>${escapeHtml(r.title)}</h3>
      <div class="budget">${escapeHtml(r.budget)}${r.mode ? ' · '+escapeHtml(r.mode) : ''}${r.city ? ' · 📍'+escapeHtml(r.city) : ''}</div>
      <p class="desc">${escapeHtml(r.desc)}</p>
      <div class="platform-tags">${platforms.map(platformTagHtml).join('')}</div>
      <div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="card-foot">
        <div class="maker">
          <span class="avatar ${escapeHtml(r.avatarBg)}">${escapeHtml(r.avatar)}</span>
          <span>${escapeHtml(r.poster)}</span>
        </div>
        <button class="btn" data-recruit-id="${escapeHtml(r.id)}">查看详情</button>
        <button class="mini-btn-link" data-friend-name="${escapeHtml(r.poster)}" title="加好友">👥</button>
        ${canDeleteOwner(r.poster) ? '<button class="mini-btn reject" data-delete-recruit-id="' + escapeHtml(r.id) + '" title="删除">🗑</button>' : ''}
      </div>
    </article>
  `;
  }).join('');
}
document.getElementById('recruitGrid').addEventListener('click', function(e) {
  var deleteBtn = e.target.closest('[data-delete-recruit-id]');
  if (deleteBtn) { e.stopPropagation(); deleteRecruit(deleteBtn.dataset.deleteRecruitId); return; }
  var recruitBtn = e.target.closest('[data-recruit-id]');
  if (recruitBtn) { e.stopPropagation(); openRecruitDrawer(recruitBtn.dataset.recruitId); return; }
  var friendBtn = e.target.closest('[data-friend-name]');
  if (friendBtn) { e.stopPropagation(); quickAddFriend(friendBtn.dataset.friendName); }
});

function deleteRecruit(id) {
  var idx = recruits.findIndex(function(r){ return r.id === id; });
  if(idx<0)return;
  if(!canDeleteOwner(recruits[idx].poster)){showToast('没有权限删除');return;}
  if(!confirm('确定删除这条招募吗？'))return;
  recruits.splice(idx,1);
  renderRecruits();
  showToast('已删除');
}

function openRecruitDrawer(id) {
  const r = recruits.find(x => x.id === id);
  if (!r) return;
  // Reset row labels for recruit mode
  document.querySelectorAll('.drawer-row h3')[0].textContent = '详细需求';
  document.querySelectorAll('.drawer-row h3')[1].textContent = '预算/报酬';
  document.querySelectorAll('.drawer-row h3')[2].textContent = '发布者';
  document.querySelectorAll('.drawer-row h3')[3].textContent = '关联平台';

  document.getElementById('drawerStatus').textContent = r.status;
  document.getElementById('drawerStatus').className = 'card-status ' + r.statusClass;
  document.getElementById('drawerTitle').textContent = r.title;
  document.getElementById('drawerDesc').textContent = r.desc;
  document.getElementById('drawerDetail').textContent = r.detail;
  document.getElementById('drawerBudget').textContent = r.budget;
  document.getElementById('drawerPoster').textContent = r.poster;
  document.getElementById('drawerPlatforms').innerHTML = safeArray(r.platforms).map(platformTagHtml).join('');
  document.getElementById('drawerTags').innerHTML = safeArray(r.tags).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  // Restore recruit actions
  document.getElementById('drawerActions').innerHTML =
    '<button class="btn" onclick="deliverNotification(\''+escapeHtml(r.poster)+'\',\'💼 招募意向：对「'+escapeHtml(r.title)+'」感兴趣\',\'招募\');showToast(\'已发送意向！对方将在聊天中收到通知 💌\');addXP(30,\'招募意向\');" style="font-size:18px;">🤝 我有意向</button>' +
    '<button class="btn secondary" onclick="showToast(\'已复制联系方式\')">📋 复制联系方式</button>';
  currentPostId = null;
  openDrawer();
}

function toggleRecruitForm() {
  var f = document.getElementById('recruitForm');
  f.style.display = f.style.display === 'none' ? '' : 'none';
}
function publishRecruit() {
  var title = document.getElementById('rfTitle').value.trim();
  var company = document.getElementById('rfCompany').value.trim();
  var type = document.getElementById('rfType').value;
  var mode = document.getElementById('rfMode').value;
  var desc = document.getElementById('rfDesc').value.trim();
  var budget = document.getElementById('rfBudget').value.trim();
  var city = document.getElementById('rfCity').value.trim();
  var sel = document.getElementById('rfPlatform');
  var platforms = Array.from(sel.selectedOptions).map(function(o) { return o.value; });
  if (!platforms.length) platforms = ['all'];
  var fb = document.getElementById('rfFeedback');
  if (!title || !company || !desc) { fb.textContent = '标题、公司和描述不能为空！'; fb.style.color = 'var(--red)'; return; }
  var modeLabels = { fulltime: '全职', parttime: '兼职', project: '项目制', intern: '实习' };
  sb.from("recruits").insert({id:"r"+Date.now(),title:title,poster:company,poster_avatar:company.slice(0,1),type:type,mode:modeLabels[mode]||mode,description:desc,detail:desc,budget:budget||"面议",city:city,platforms:platforms,tags:[],status:"招募中",status_class:"active-recruit"}).then(function(){});
recruits.unshift({
    id: 'r' + Date.now(),
    title: title,
    poster: company,
    avatar: company.slice(0, 1),
    avatarBg: '',
    type: type,
    mode: modeLabels[mode] || mode,
    desc: desc,
    detail: desc,
    budget: budget || '面议',
    city: city,
    platforms: platforms,
    tags: [type === 'urgent' ? '急招' : type === 'maker' ? '达人' : type === 'merchant' ? '商家' : '技能', modeLabels[mode] || ''],
    status: '招募中',
    statusClass: 'active-recruit',
    postedAt: Date.now()
  });
  // Clear form
  document.getElementById('rfTitle').value = ''; document.getElementById('rfCompany').value = ''; document.getElementById('rfDesc').value = ''; document.getElementById('rfBudget').value = ''; document.getElementById('rfCity').value = '';
  track('recruit_publish',{type:type,mode:mode,city:city,platforms_count:platforms.length});
  toggleRecruitForm();
  renderRecruits();
  fb.textContent = '招募已发布！'; fb.style.color = 'var(--sage)';
  setTimeout(function() { fb.textContent = ''; }, 2000);
  addXP(30, '发布招募');
}

// Match filters
document.getElementById('matchFilters').addEventListener('click', function(e){
  var btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#matchFilters .filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  matchFilter = btn.dataset.mfilter;
  track('match_filter_apply',{filter_type:'view',filter_value:matchFilter});
  renderMatch();
});

// Recruit filters
document.getElementById('recruitFilters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#recruitFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRecruits(btn.dataset.filter);
});

// ========================================
// MATCH
// ========================================
var matchFilter = 'all';
function renderMatch() {
  var showBrand = matchFilter === 'all' || matchFilter === 'brand';
  var showCreator = matchFilter === 'all' || matchFilter === 'creator';
  document.getElementById('brandCol').style.display = showBrand ? '' : 'none';
  document.getElementById('creatorCol').style.display = showCreator ? '' : 'none';
  if (showBrand && showCreator) {
    document.getElementById('matchColumns').style.gridTemplateColumns = '1fr 1fr';
  } else {
    document.getElementById('matchColumns').style.gridTemplateColumns = '1fr';
  }

  document.getElementById('brandSeeking').innerHTML = brandSeekingData.map((b, i) => `
    <article class="card" style="--tilt:${randTilt(i)};--tape:${randTape(i)}">
      <div class="card-top">
        <span class="card-status seeking">品牌方</span>
      </div>
      <h3>${escapeHtml(b.title)}</h3>
      <div class="budget">${escapeHtml(b.budget)}</div>
      <p class="desc">${escapeHtml(b.desc)}</p>
      <div class="platform-tags">${b.platforms.map(platformTagHtml).join('')}</div>
      <div class="tags">${b.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="card-foot">
        <div class="maker">
          <span class="avatar ${escapeHtml(b.avatarBg)}">${escapeHtml(b.avatar)}</span>
          <span>${escapeHtml(b.brand)}</span>
        </div>
        <button class="btn" data-match-name="${escapeHtml(b.brand)}" data-match-role="品牌方">我想合作</button>
        <button class="mini-btn-link" data-friend-name="${escapeHtml(b.brand)}" title="加好友">👥</button>
        ${canDeleteOwner(b.brand) ? '<button class="mini-btn reject" data-delete-match-id="' + escapeHtml(b.id) + '" data-delete-match-type="brand" title="删除">🗑</button>' : ''}
      </div>
    </article>
  `).join('');

  document.getElementById('creatorSeeking').innerHTML = creatorSeekingData.map((c, i) => {
    var cps = c.creator===myProfile.name ? safeArray(myProfile.connectedPlatforms) : safeArray(c.connectedPlatforms);
    var connectedBadge = cps.length ? '<span class="connected-badge">🏅'+cps.length+'平台已连接</span>' : '';
    return `
    <article class="card" style="--tilt:${randTilt(i)};--tape:${randTape(i)}">
      <div class="card-top">
        <span class="card-status seeking">达人</span>
      </div>
      <h3>${escapeHtml(c.title)}</h3>
      <div class="budget">${escapeHtml(c.budget)}</div>
      <p class="desc">${escapeHtml(c.desc)}</p>
      <div class="platform-tags">${c.platforms.map(platformTagHtml).join('')}</div>
      <div class="tags">${c.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="card-foot">
        <div class="maker">
          <span class="avatar ${escapeHtml(c.avatarBg)}">${escapeHtml(c.avatar)}</span>
          <span>${escapeHtml(c.creator)}${connectedBadge}</span>
        </div>
        <button class="btn" data-match-name="${escapeHtml(c.creator)}" data-match-role="达人">联系TA</button>
        <button class="mini-btn-link" data-friend-name="${escapeHtml(c.creator)}" title="加好友">👥</button>
        ${canDeleteOwner(c.creator) ? '<button class="mini-btn reject" data-delete-match-id="' + escapeHtml(c.id) + '" data-delete-match-type="creator" title="删除">🗑</button>' : ''}
      </div>
    </article>
  `;
  }).join('');
  track('match_view',{view_mode:matchFilter});
}
document.getElementById('matchColumns').addEventListener('click', function(e) {
  var matchBtn = e.target.closest('[data-match-name]');
  if (matchBtn) { e.stopPropagation(); openMatchMsg(e, matchBtn.dataset.matchName, matchBtn.dataset.matchRole); return; }
  var friendBtn = e.target.closest('[data-friend-name]');
  if (friendBtn) { e.stopPropagation(); quickAddFriend(friendBtn.dataset.friendName); return; }
  var deleteBtn = e.target.closest('[data-delete-match-id]');
  if (deleteBtn) { e.stopPropagation(); deleteMatch(deleteBtn.dataset.deleteMatchId, deleteBtn.dataset.deleteMatchType); }
});

function deleteMatch(id, type) {
  var arr = type === 'brand' ? brandSeekingData : creatorSeekingData;
  var idx = arr.findIndex(function(x){ return x.id === id; });
  if(idx<0)return;
  var owner=type==='brand'?arr[idx].brand:arr[idx].creator;
  if(!canDeleteOwner(owner)){showToast('没有权限删除');return;}
  if (!confirm('确定删除这条对接需求吗？')) return;
  if (idx >= 0) { arr.splice(idx, 1); renderMatch(); showToast('已删除'); }
}

// ========================================
// LOCAL MATCH
// ========================================
var localDemands = [];
var localFilter = 'all';
try { var savedLD = localStorage.getItem('creatorhub_local_demands'); if (savedLD) localDemands = JSON.parse(savedLD); } catch(_) { localDemands = []; }

function toggleLocalDemandForm() { var f=document.getElementById('localDemandForm'); f.style.display=f.style.display==='none'?'':'none'; }

function publishLocalDemand() {
  var bname=document.getElementById('ldBusiness').value.trim();
  var cat=document.getElementById('ldCategory').value;
  var city=document.getElementById('ldCity').value.trim();
  var dist=document.getElementById('ldDistrict').value.trim();
  var title=document.getElementById('ldTitle').value.trim();
  var desc=document.getElementById('ldDesc').value.trim();
  var budget=document.getElementById('ldBudget').value.trim();
  var reqs=document.getElementById('ldRequirements').value.trim();
  var contact=document.getElementById('ldContact').value.trim();
  var fb=document.getElementById('ldFeedback');
  if(!bname||!city||!title||!desc){fb.textContent='商家名称、城市、标题和描述不能为空！';fb.style.color='var(--red)';return;}
  localDemands.unshift({id:'ld'+Date.now(),businessName:bname,city:city,district:dist,category:cat,title:title,description:desc,budget:budget||'面议',requirements:reqs,contact:contact,postedBy:currentUser,postedAt:Date.now(),status:'open'});
  localStorage.setItem('creatorhub_local_demands',JSON.stringify(localDemands));
  track('local_demand_publish',{city:city,category:cat,budget:budget});
  document.getElementById('ldBusiness').value='';document.getElementById('ldTitle').value='';document.getElementById('ldDesc').value='';document.getElementById('ldBudget').value='';document.getElementById('ldRequirements').value='';document.getElementById('ldContact').value='';document.getElementById('ldDistrict').value='';
  toggleLocalDemandForm();fb.textContent='需求已发布！';fb.style.color='var(--sage)';
  setTimeout(function(){fb.textContent='';},2000);
  addXP(40,'发布本地需求');
  renderLocalMatch();
}

function renderLocalMatch() {
  var cityFilter=document.getElementById('localCityFilter')?document.getElementById('localCityFilter').value.trim():'';
  var items=localDemands;
  if(localFilter!=='all')items=items.filter(function(d){return d.category===localFilter;});
  if(cityFilter)items=items.filter(function(d){return d.city.indexOf(cityFilter)!==-1;});
  var catLabels={food:'🍔 餐饮',beauty:'💆 美容',fitness:'🏋 健身',entertainment:'🎬 娱乐',hotel:'🏨 酒店',retail:'🛒 零售',other:'📌 其他'};
  var grid=document.getElementById('localDemandsGrid');
  if(!items.length){grid.innerHTML='<p style="color:rgba(45,45,45,.4);padding:20px;text-align:center;">该筛选条件下暂无本地需求<br><small>试试切换城市或品类，或者发布第一条需求！</small></p>';}
  else {grid.innerHTML=items.map(function(d,i){var isMine=canDeleteOwner(d.postedBy||d.poster);return '<article class="card" style="--tilt:'+randTilt(i)+';--tape:'+randTape(i)+'"><div class="card-top"><span class="card-status seeking">'+(catLabels[d.category]||d.category)+'</span></div><h3>'+escapeHtml(d.businessName)+'</h3><p style="font-size:14px;color:rgba(45,45,45,.6);">📍 '+escapeHtml(d.city)+(d.district?'·'+escapeHtml(d.district):'')+'</p><p style="font-weight:600;">'+escapeHtml(d.title)+'</p><p class="desc">'+escapeHtml(d.description)+'</p><div class="budget">'+escapeHtml(d.budget)+'</div><p style="font-size:13px;color:rgba(45,45,45,.5);">要求：'+escapeHtml(d.requirements||'无特殊要求')+'</p><div class="card-foot"><button class="btn" onclick="localMatchIntent(\''+d.id+'\')">🤝 我要接</button>'+'<span style="font-size:13px;color:rgba(45,45,45,.4);margin-left:8px;">'+escapeHtml(d.contact)+'</span>'+(isMine?'<button class="mini-btn reject" onclick="event.stopPropagation();deleteLocalDemand(\''+d.id+'\')" title="删除">🗑</button>':'')+'</div></article>';}).join('');}

  // Local creators recommendations
  var creators=allUsers.filter(function(u){return u.role==='creator'&&(!cityFilter||(u.city&&u.city.indexOf(cityFilter)!==-1));}).slice(0,6);
  var cgrid=document.getElementById('localCreatorsGrid');
  if(!creators.length){cgrid.innerHTML='<p style="color:rgba(45,45,45,.4);">暂无该城市的达人数据</p>';}
  else {cgrid.innerHTML=creators.map(function(u,i){var lvl=Math.min(10,Math.floor((userXP[u.id]||0)/500)+1);return '<div class="card" style="--tilt:'+randTilt(i)+';--tape:'+randTape(i)+';text-align:center;"><div class="avatar" style="background:'+(u.avatarBg||'var(--avatar)')+';width:48px;height:48px;margin:0 auto 8px;">'+u.avatar+'</div><b>'+escapeHtml(u.name)+'</b><span class="tag" style="display:block;margin:4px auto;">Lv.'+lvl+'</span><p style="font-size:13px;color:rgba(45,45,45,.5);">📍 '+escapeHtml(u.city||'未知')+'</p><button class="btn" onclick="chatWithFriend(\''+u.id+'\')" style="margin-top:6px;">💬 邀约</button></div>';}).join('');}
  track('local_match_view',{city:cityFilter||'all',category:localFilter});
}

function localMatchIntent(did) {
  var d=localDemands.find(function(x){return x.id===did;});
  if(!d)return;
  deliverNotification(d.postedBy,'📍 本地合作意向：对「'+d.title+'」感兴趣，联系方式：'+d.contact,'本地对接-'+d.businessName);
  showToast('已向 '+d.businessName+' 发送合作意向，对方将在聊天中收到通知 💌');
  addXP(30,'本地对接意向');
}

document.getElementById('localFilters').addEventListener('click',function(e){
  var btn=e.target.closest('.filter-btn');
  if(!btn)return;
  document.querySelectorAll('#localFilters .filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  localFilter=btn.dataset.lfilter;
  renderLocalMatch();
});

function deleteLocalDemand(did) {
  var idx = localDemands.findIndex(function(x) { return x.id === did; });
  if(idx<0)return;
  if(!canDeleteOwner(localDemands[idx].postedBy||localDemands[idx].poster)){showToast('没有权限删除');return;}
  if (!confirm('确定删除这条本地需求吗？')) return;
  if (idx >= 0) { localDemands.splice(idx, 1); localStorage.setItem('creatorhub_local_demands', JSON.stringify(localDemands)); renderLocalMatch(); showToast('已删除'); }
}

// ========================================
// COMMUNITY
// ========================================
function isLiked(postId){return isLikedInMap(_myLikes,postId);}
function toggleLike(postId){
  var p=posts.find(function(x){return x.id===postId;});
  if(!p||!currentUser)return;
  var wasLiked=isLiked(postId);
  var next=nextLikeState(p.likes,wasLiked);
  _myLikes[postId]=next.liked;
  p.likes=next.likes;
  _likeLock[postId]=Date.now();
  if(wasLiked){
    sb.from("post_likes").delete().eq("post_id",postId).eq("username",currentUser).then(function(){});
  }else{
    sb.from("post_likes").insert({post_id:postId,username:currentUser}).then(function(){});
    if(p.maker&&p.maker!==currentUser&&p.maker!==myProfile.name&&p.maker!=="我"){
      deliverNotification(p.maker,"❤️ 赞了你的帖子：「"+p.title.slice(0,30)+"」","点赞");
    }
    addXP(5,"点赞");
  }
  sb.from("posts").update({likes:p.likes,updated_at:new Date().toISOString()}).eq("id",postId).then(function(){});
  renderPosts("all");
  var likeBtn=document.getElementById("likeBtn");
  if(likeBtn&&currentPostId===postId)likeBtn.textContent=(isLiked(postId)?"👍 已赞":"👍 点赞")+" ("+(p.likes||0)+")";
}
function likePost(postId){toggleLike(postId);}

function createPost(titleArg,categoryArg,contentArg,platformArg) {
  const title = titleArg || document.getElementById('postTitle').value.trim();
  const content = contentArg || document.getElementById('postContent').value.trim();
  const category = categoryArg || document.getElementById('postCategory').value;
  const platform = platformArg || document.getElementById('postPlatform').value;
  const feedback = document.getElementById('postFeedback');

  if (!title || !content) {
    if(feedback){feedback.textContent = '标题和内容不能为空！';feedback.style.color = 'var(--red)';}
    return;
  }

  const catLabels = { exp: '经验分享', guide: '干货教程', qa: '求助问答', news: '行业动态', newbie: '🆕 新人报到', industry: '💬 行业讨论' };
  sb.from("posts").insert({id:"p"+(nextPostId),author:myProfile.name,author_avatar:myProfile.avatar,title:title,category:category,category_label:catLabels[category],content:content,platform:platform||"all"}).then(function(){});

  posts.unshift({
    id: 'p' + nextPostId++,
    title, category, categoryLabel: catLabels[category],
    maker: '我', avatar: '我', time: '刚刚',
    desc: content.slice(0, 80) + (content.length > 80 ? '...' : ''),
    platform: platform || 'all',
    likes: 0, comments: 0
  });

  if(!titleArg){document.getElementById('postTitle').value = '';document.getElementById('postContent').value = '';}
  track('post_create',{category:category,length:content.length});
  addXP(50, '发布帖子');
  if(feedback&&!titleArg){feedback.textContent = '发布成功！+50XP';feedback.style.color = 'var(--sage)';setTimeout(() => { feedback.textContent = ''; }, 2000);}
  renderPosts();
}

function renderPosts(filter = 'all') {
  let items = filter === 'all' ? posts : posts.filter(p => p.category === filter);
  if(!items.length){document.getElementById('postGrid').innerHTML='<p class="empty-state">还没有帖子，发第一篇吧</p>';return;}
  document.getElementById('postGrid').innerHTML = items.map((p, i) => `
    <article class="post-card" style="--tilt:${randTilt(i)};--tape:${randTape(i)};cursor:pointer;" data-post-id="${escapeHtml(p.id)}">
      <span class="post-category ${escapeHtml(p.category)}">${escapeHtml(p.categoryLabel)}</span>
      <h3>${escapeHtml(p.title)}</h3>
      ${p.platform && p.platform !== 'all' ? `<div class="platform-tags" style="margin:6px 0;">${platformTagHtml(p.platform)}</div>` : ''}
      <p>${escapeHtml(p.desc)}</p>
      <div class="post-stats">
        <span>👍 ${p.likes}</span>
        <span>💬 ${p.comments}</span>
      </div>
      <div class="card-foot">
        <div class="maker">
          <span class="avatar">${escapeHtml(p.avatar)}</span>
          <span>${escapeHtml(p.maker)}</span>
        </div>
        <span style="font-size:14px;color:rgba(45,45,45,.5);">${escapeHtml(p.time)}</span>
        ${canDeleteOwner(p.maker) ? '<button class="mini-btn reject" data-delete-post-id="' + escapeHtml(p.id) + '" title="删除">🗑</button>' : ''}
      </div>
    </article>
  `).join('');
}
document.getElementById('postGrid').addEventListener('click', function(e) {
  var deleteBtn = e.target.closest('[data-delete-post-id]');
  if (deleteBtn) { e.stopPropagation(); deletePost(deleteBtn.dataset.deletePostId); return; }
  var card = e.target.closest('[data-post-id]');
  if (card) openPostDetail(card.dataset.postId);
});

// Post filters
document.getElementById('postFilters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('#postFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  track('community_filter',{filter_type:btn.dataset.filter});
  renderPosts(btn.dataset.filter);
});

// ========================================
// DRAWER
// ========================================
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('overlay').classList.add('show');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('overlay').classList.remove('show');
}


// ========================================
// FRIENDS DATA & LOGIC
// ========================================

// All users in the system (discoverable)
const allUsers = [
  { id: "u1", name: "美妆达人小A", avatar: "A", avatarBg: "xhs-bg", role: "creator", roleLabel: "创作者/达人", online: true,
    desc: "小红书美妆创作者，擅长护肤测评和妆容教程，粉丝12w+。", platforms: ["xhs"], tags: ["美妆","护肤","测评"], followers: "12.8w" },
  { id: "u2", name: "数码品牌方老张", avatar: "张", avatarBg: "dy-bg", role: "brand", roleLabel: "品牌方", online: true,
    desc: "科技数码品牌市场总监，负责达人合作与品牌推广。", platforms: ["douyin","bilibili"], tags: ["数码","品牌方","科技"], followers: "品牌账号50w+" },
  { id: "u3", name: "美食主播大刘", avatar: "刘", avatarBg: "ks-bg", role: "creator", roleLabel: "创作者/主播", online: false,
    desc: "快手美食类主播，擅长火锅探店和家常菜直播，粉丝8w。", platforms: ["kuaishou"], tags: ["美食","探店","直播"], followers: "8.2w" },
  { id: "u4", name: "B站UP主小王", avatar: "王", avatarBg: "bi-bg", role: "creator", roleLabel: "创作者/UP主", online: true,
    desc: "B站科技区UP主，做数码产品评测和剪辑教程，粉丝15w。", platforms: ["bilibili"], tags: ["科技","评测","教程"], followers: "15.3w" },
  { id: "u5", name: "MCN星辰文化", avatar: "星", avatarBg: "", role: "merchant", roleLabel: "MCN机构", online: false,
    desc: "专注达人孵化与品牌对接的MCN机构，签约达人50+，覆盖全平台。", platforms: ["douyin","xhs","kuaishou","bilibili"], tags: ["MCN","达人孵化","品牌对接"], followers: "矩阵粉丝200w+" },
  { id: "u6", name: "穿搭师Nina", avatar: "N", avatarBg: "xhs-bg", role: "creator", roleLabel: "创作者/达人", online: true,
    desc: "小红书10w粉穿搭博主，极简通勤风，22-35岁女性用户为主。", platforms: ["xhs"], tags: ["穿搭","通勤风","时尚"], followers: "10.6w" },
  { id: "u7", name: "优选供应链-陈总", avatar: "陈", avatarBg: "ks-bg", role: "merchant", roleLabel: "商家/供应链", online: false,
    desc: "家居日用品源头工厂，提供直播带货一站式供应链服务。", platforms: ["kuaishou","douyin"], tags: ["供应链","家居","直播带货"], followers: "合作主播200+" },
  { id: "u8", name: "游戏谷工作室", avatar: "游", avatarBg: "bi-bg", role: "brand", roleLabel: "品牌/工作室", online: true,
    desc: "独立游戏工作室，寻找B站/抖音游戏类UP主做新游推广。", platforms: ["bilibili","douyin"], tags: ["游戏","独立游戏","推广"], followers: "旗下游戏玩家30w+" },
  { id: "u9", name: "运营老司机", avatar: "运", avatarBg: "", role: "creator", roleLabel: "创作者/博主", online: true,
    desc: "3年小红书运营经验，分享平台规则和运营干货。", platforms: ["xhs"], tags: ["运营","干货","小红书"], followers: "5.8w" },
  { id: "u10", name: "剧有趣工作室", avatar: "剧", avatarBg: "dy-bg", role: "creator", roleLabel: "创作团队", online: false,
    desc: "抖音50w+剧情类达人，含编导+拍摄+后期全链条。", platforms: ["douyin"], tags: ["剧情","品牌植入","专业团队"], followers: "52.1w" },
  { id: "u11", name: "薇诺肌品牌", avatar: "薇", avatarBg: "xhs-bg", role: "brand", roleLabel: "品牌方", online: true,
    desc: "敏感肌修护护肤品牌，主打真实测评类推广合作。", platforms: ["xhs","douyin"], tags: ["护肤","敏感肌","品牌"], followers: "品牌账号20w+" },
  { id: "u12", name: "跃动体育", avatar: "跃", avatarBg: "dy-bg", role: "brand", roleLabel: "品牌方", online: false,
    desc: "新锐运动品牌，运动鞋服系列，寻找运动健身类主播带货。", platforms: ["douyin","kuaishou"], tags: ["运动","鞋服","直播带货"], followers: "品牌账号35w+" },
  { id: "u13", name: "跨境出海小林", avatar: "林", avatarBg: "", role: "creator", roleLabel: "创作者/博主", online: true,
    desc: "TikTok+YouTube英语内容创作者，做中国文化出海内容，粉丝50w+。", platforms: ["tiktok","youtube"], tags: ["出海","英语","中国文化"], followers: "52w" },
  { id: "u14", name: "得物穿搭师Coco", avatar: "C", avatarBg: "xhs-bg", role: "creator", roleLabel: "创作者/达人", online: true,
    desc: "得物+小红书双平台潮流穿搭博主，主攻球鞋和街头风。", platforms: ["dewu","xhs"], tags: ["潮流","球鞋","街头"], followers: "8.9w" },
  { id: "u15", name: "淘宝品牌代播-老赵", avatar: "赵", avatarBg: "dy-bg", role: "merchant", roleLabel: "商家/代播", online: false,
    desc: "淘宝+拼多多双平台直播代运营，专做食品和农产品类目。", platforms: ["taobao","pdd"], tags: ["直播代运营","食品","农产品"], followers: "合作品牌30+" },
  { id: "u16", name: "知乎科技大V", avatar: "知", avatarBg: "", role: "creator", roleLabel: "创作者/KOL", online: true,
    desc: "知乎科技领域头部答主，擅长数码评测和行业深度分析。", platforms: ["zhihu"], tags: ["科技","评测","深度内容"], followers: "18w" },
  { id: "u17", name: "IG视觉创作者", avatar: "I", avatarBg: "", role: "creator", roleLabel: "创作者/摄影师", online: false,
    desc: "Instagram视觉内容创作者，专注产品摄影和生活方式美学。", platforms: ["instagram","xhs"], tags: ["视觉","摄影","生活方式"], followers: "6.5w" },
];

// My friends (initially friends with some users)
let myFriends = ["u1", "u2", "u4", "u6", "u9"];

// Friend requests (incoming)
let friendRequests = [
  { from: "u3", message: "你好！想和你交流一下美食类内容的创作经验", time: "2小时前" },
  { from: "u11", message: "看到你的账号，想聊聊品牌合作的可能性", time: "5小时前" },
];

let currentFriendTab = "my";

function getFriendData() {
  return allUsers.filter(u => myFriends.includes(u.id));
}

function getRequestData() {
  return friendRequests.map(r => {
    const user = allUsers.find(u => u.id === r.from);
    return { ...r, user };
  }).filter(r => r.user);
}

function getDiscoverData(search = "") {
  const friendIds = new Set(myFriends);
  const requestedIds = new Set(friendRequests.map(r => r.from));
  let pool = allUsers.filter(u => !friendIds.has(u.id));
  if (search) {
    const q = search.toLowerCase();
    pool = pool.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.desc.toLowerCase().includes(q) ||
      u.tags.some(t => t.toLowerCase().includes(q)) ||
      u.platforms.some(p => p.toLowerCase().includes(q))
    );
  }
  return pool.map(u => ({ ...u, isRequested: requestedIds.has(u.id) }));
}

function updateFriendBadge() {
  const count = friendRequests.length;
  const badge = document.getElementById('friendBadge');
  const reqBadge = document.getElementById('reqBadge');
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
  reqBadge.textContent = count;
  reqBadge.style.display = count > 0 ? '' : 'none';
}

function switchFriendTab(tab) {
  currentFriendTab = tab;
  document.querySelectorAll('.friend-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-ftab="${tab}"]`).classList.add('active');
  document.getElementById('friendSearchInput').value = '';
  if (tab === 'discover') {
    document.getElementById('friendSearchInput').placeholder = '搜索创作者、商家、品牌...';
  } else {
    document.getElementById('friendSearchInput').placeholder = '搜索好友...';
  }
  renderFriendsList();
}

function renderFriendsList() {
  const container = document.getElementById('friendsList');
  const tab = currentFriendTab;
  const search = document.getElementById('friendSearchInput').value.trim().toLowerCase();

  if (tab === 'my') {
    let friends = getFriendData();
    if (search) friends = friends.filter(f => f.name.toLowerCase().includes(search) || f.tags.some(t => t.toLowerCase().includes(search)));
    document.getElementById('myFriendsCount').textContent = `(${friends.length})`;
    container.innerHTML = friends.length === 0
      ? '<p class="empty-state">还没有好友？<button class="mini-btn add" onclick="switchFriendTab(\'discover\')" style="margin-left:8px;">去发现新朋友吧</button></p>'
      : friends.map(f => `
        <div class="friend-item" data-uid="${escapeHtml(f.id)}">
          <span class="avatar ${f.online ? 'online' : ''}" style="${avatarStyle(f.name)}">${escapeHtml(f.avatar)}</span>
          <div class="friend-item-info">
            <div class="name">${escapeHtml(f.name)} ${f.online ? '<span style="color:var(--sage);font-size:12px;">●在线</span>' : ''}</div>
            <div class="brief">${escapeHtml(f.roleLabel)} · ${escapeHtml(f.platforms.join('/'))}</div>
          </div>
          <div class="friend-item-actions">
            <button class="mini-btn msg" data-chat-friend-id="${escapeHtml(f.id)}" title="发消息">💬</button>
            <button class="mini-btn reject" data-remove-friend-id="${escapeHtml(f.id)}" title="删除好友">✕</button>
          </div>
        </div>
      `).join('');

  } else if (tab === 'requests') {
    let reqs = getRequestData();
    if (search) reqs = reqs.filter(r => r.user.name.toLowerCase().includes(search));
    container.innerHTML = reqs.length === 0
      ? '<p style="text-align:center;padding:30px;color:rgba(45,45,45,.45);">没有待处理的好友请求</p>'
      : reqs.map(r => `
        <div class="friend-item">
          <span class="avatar" style="${avatarStyle(r.user.name)}">${escapeHtml(r.user.avatar)}</span>
          <div class="friend-item-info">
            <div class="name">${escapeHtml(r.user.name)}</div>
            <div class="brief">${escapeHtml(r.message)} · ${r.time}</div>
          </div>
          <div class="friend-item-actions">
            <button class="mini-btn accept" data-accept-request-id="${escapeHtml(r.from)}">接受</button>
            <button class="mini-btn reject" data-reject-request-id="${escapeHtml(r.from)}">拒绝</button>
          </div>
        </div>
      `).join('');
  } else if (tab === 'discover') {
    let users = getDiscoverData(search);
    container.innerHTML = users.length === 0
      ? '<p style="text-align:center;padding:30px;color:rgba(45,45,45,.45);">没找到匹配的用户</p>'
      : users.map(u => `
        <div class="friend-item" data-uid="${escapeHtml(u.id)}">
          <span class="avatar ${u.online ? 'online' : ''}" style="${avatarStyle(u.name)}">${escapeHtml(u.avatar)}</span>
          <div class="friend-item-info">
            <div class="name">${escapeHtml(u.name)}</div>
            <div class="brief">${escapeHtml(u.roleLabel)} · ${escapeHtml(u.tags.slice(0,2).join('、'))}</div>
          </div>
          <div class="friend-item-actions">
            ${u.isRequested
              ? '<span style="font-size:13px;color:rgba(45,45,45,.4);">已发送请求</span>'
              : '<button class="mini-btn add" data-send-request-id="' + escapeHtml(u.id) + '">加好友</button>'
            }
          </div>
        </div>
      `).join('');
  }
}
document.getElementById('friendsList').addEventListener('click', function(e) {
  var action = e.target.closest('[data-chat-friend-id],[data-remove-friend-id],[data-accept-request-id],[data-reject-request-id],[data-send-request-id]');
  if (action) {
    e.stopPropagation();
    if (action.dataset.chatFriendId) chatWithFriend(action.dataset.chatFriendId);
    else if (action.dataset.removeFriendId) removeFriend(action.dataset.removeFriendId);
    else if (action.dataset.acceptRequestId) acceptRequest(action.dataset.acceptRequestId);
    else if (action.dataset.rejectRequestId) rejectRequest(action.dataset.rejectRequestId);
    else if (action.dataset.sendRequestId) sendFriendRequest(action.dataset.sendRequestId);
    return;
  }
  var item = e.target.closest('[data-uid]');
  if (item) showFriendProfile(item.dataset.uid);
});

function showFriendProfile(uid) {
  track('profile_view',{target_user:uid,source:_currentTab});
  const user = allUsers.find(u => u.id === uid);
  if (!user) return;

  // Highlight active item
  document.querySelectorAll('.friend-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.friend-item[data-uid="${uid}"]`);
  if (item) item.classList.add('active');

  const isFriend = myFriends.includes(uid);
  const isRequested = friendRequests.some(r => r.from === uid);
  const profileDiv = document.getElementById('friendsProfile');

  profileDiv.innerHTML = `
    <div class="friend-profile-card">
      <div class="big-avatar ${user.online ? 'online' : ''}" style="background:${user.avatarBg || 'var(--avatar)'}">${user.avatar}</div>
      <h3>${escapeHtml(user.name)}</h3>
      <span class="profile-role ${user.role}">${escapeHtml(user.roleLabel)}</span>
      <p class="profile-desc">${escapeHtml(user.desc)}</p>
      <div class="profile-stats">
        <div><b>${escapeHtml(user.followers)}</b><br>粉丝/关注</div>
        <div>${user.online ? '<b style="color:var(--sage)">在线</b>' : '<b style="color:rgba(45,45,45,.4)">离线</b>'}<br>状态</div>
      </div>
      <div class="platform-tags" style="justify-content:center;">${user.platforms.map(platformTagHtml).join('')}</div>
      <div class="tags" style="justify-content:center;margin-top:8px;">${user.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="friend-profile-actions">
        ${isFriend ? `
          <button class="btn" onclick="chatWithFriend('${uid}')">💬 发消息</button>
          <button class="btn secondary" onclick="removeFriend('${uid}')">删除好友</button>
        ` : (isRequested ? `
          <span style="padding:10px;color:rgba(45,45,45,.5);font-size:16px;">已发送好友请求，等待对方通过</span>
        ` : `
          <button class="btn" onclick="sendFriendRequest('${uid}')">👥 加为好友</button>
        `)}
      </div>
    </div>
  `;
}

function sendFriendRequest(uid) {
  if (myFriends.includes(uid)) { showToast('你们已经是好友了！'); return; }
  if (friendRequests.some(r => r.from === uid)) { showToast('已经发送过好友请求了'); return; }
  const user = allUsers.find(u => u.id === uid);
  friendRequests.push({ from: uid, message: '想加你为好友，一起交流！', time: '刚刚' });
  deliverNotification(uid,'👥 好友请求：想加你为好友，一起交流！','好友请求');
  updateFriendBadge();
  renderFriendsList();
  showFriendProfile(uid);
  showToast(`已向 ${user.name} 发送好友请求，对方将在聊天中收到通知 💌`);
}

function acceptRequest(uid) {
  const idx = friendRequests.findIndex(r => r.from === uid);
  const user = allUsers.find(u => u.id === uid);
  if (idx >= 0) friendRequests.splice(idx, 1);
  if (!myFriends.includes(uid)) myFriends.push(uid);
  track('friend_add',{target_user:uid,source:_currentTab});
  // Also add to chat contacts if not already there
  if (!contacts.find(c => c.id === 'f_' + uid)) {
    contacts.push({
      id: 'f_' + uid, name: user.name, avatar: user.avatar, avatarBg: user.avatarBg,
      platform: user.platforms[0] || 'all', unread: 0,
      lastMsg: '你们已成为好友，开始聊天吧！',
      messages: [{ from: 'them', text: '你好！很高兴认识你 🤝', time: '刚刚' }]
    });
  }
  updateFriendBadge();
  renderFriendsList();
  showFriendProfile(uid);
  addXP(20, '添加好友');
  showToast(`已通过 ${user.name} 的好友请求 +20XP`);
}

function rejectRequest(uid) {
  const idx = friendRequests.findIndex(r => r.from === uid);
  const user = allUsers.find(u => u.id === uid);
  if (idx >= 0) friendRequests.splice(idx, 1);
  updateFriendBadge();
  renderFriendsList();
  showToast(`已拒绝 ${user.name} 的好友请求`);
}

function removeFriend(uid) {
  const idx = myFriends.indexOf(uid);
  const user = allUsers.find(u => u.id === uid);
  if (idx >= 0) myFriends.splice(idx, 1);
  // Also remove from chat contacts
  const cidx = contacts.findIndex(c => c.id === 'f_' + uid);
  if (cidx >= 0) contacts.splice(cidx, 1);
  if (activeContact && activeContact.id === 'f_' + uid) {
    activeContact = null;
    document.getElementById('chatMessages').innerHTML = '<p style="color:rgba(45,45,45,.4);text-align:center;margin-top:60px;">👈 左边选一个人开始聊天</p>';
    document.getElementById('chatName').textContent = '选择一个对话';
  }
  updateFriendBadge();
  renderFriendsList();
  showToast(`已删除好友 ${user.name}`);
}

function quickAddFriend(name) {
  // Try to find user by name in allUsers
  const user = allUsers.find(u => u.name === name || u.name.includes(name) || name.includes(u.name));
  if (!user) {
    showToast('未找到该用户，请在好友页搜索添加');
    return;
  }
  if (myFriends.includes(user.id)) {
    showToast('你们已经是好友了！');
    return;
  }
  if (friendRequests.some(r => r.from === user.id)) {
    showToast('已经发送过好友请求了');
    return;
  }
  friendRequests.push({ from: user.id, message: '想加你为好友，一起交流！', time: '刚刚' });
  deliverNotification(user.id,'👥 好友请求：想加你为好友，一起交流！','好友请求');
  updateFriendBadge();
  showToast(`已向 ${user.name} 发送好友请求，对方将在聊天中收到通知 💌`);
}

function chatWithFriend(uid) {
  const user = allUsers.find(u => u.id === uid);
  if (!user) return;
  // Find or create chat contact
  let contact = contacts.find(c => c.id === 'f_' + uid);
  if (!contact) {
    contact = {
      id: 'f_' + uid, name: user.name, avatar: user.avatar, avatarBg: user.avatarBg,
      platform: user.platforms[0] || 'all', unread: 0,
      lastMsg: '你们已成为好友，开始聊天吧！',
      messages: [{ from: 'them', text: '你好！很高兴认识你 🤝', time: '刚刚' }]
    };
    contacts.push(contact);
  }
  switchTab('chat');
  selectContact('f_' + uid);
}

// Friend tab switching
document.querySelector('.friend-tabs').addEventListener('click', e => {
  const btn = e.target.closest('.friend-tab-btn');
  if (!btn) return;
  switchFriendTab(btn.dataset.ftab);
});

// Friend search
document.getElementById('friendSearchInput').addEventListener('input', function() {
  renderFriendsList();
});

// ========================================
// PROFILE DATA & LOGIC
// ========================================
const myProfile = {
  name: "我", avatar: "我", role: "creator", roleLabel: "创作者 / 达人",
  bio: "跨平台创作者，分享创作和运营经验。喜欢探索新平台和新玩法。",
  platforms: ["xhs", "douyin", "bilibili"],
  tags: ["创作", "运营", "探店"],
  connectedPlatforms: [],
  city: "", workStatus: "",
  online: true
};

function renderProfile() {
  // Update profile home
  document.getElementById('profileBigAvatar').textContent = myProfile.avatar;
  document.getElementById('profileBigAvatar').style.background = avatarGradient(myProfile.name);
  document.getElementById('profileBigAvatar').style.color = '#fff';
  document.getElementById('profileBigAvatar').style.fontSize = '40px';
  renderAvatarPicker();
  document.getElementById('profileName').textContent = myProfile.name;
  document.getElementById('profileRole').textContent = myProfile.roleLabel;
  document.getElementById('profileStatus').innerHTML = myProfile.online ? '● 在线' : '○ 离线';
  document.getElementById('profileStatus').style.color = myProfile.online ? 'var(--sage)' : 'rgba(45,45,45,.4)';
  document.getElementById('profileBio').textContent = myProfile.bio;
  document.getElementById('profileCity').textContent = myProfile.city ? '📍 '+myProfile.city : '';
  document.getElementById('profileCity').style.display = myProfile.city ? '' : 'none';
  var wsLabels = {fulltime:'🟢 可全职',parttime:'🔵 可兼职',project:'🟠 可项目制',not_looking:'⚫ 暂不求职'};
  document.getElementById('profileWorkStatus').textContent = myProfile.workStatus ? '💼 '+ (wsLabels[myProfile.workStatus]||myProfile.workStatus) : '';
  document.getElementById('profileWorkStatus').style.display = myProfile.workStatus ? '' : 'none';
  document.getElementById('profilePlatforms').innerHTML = myProfile.platforms.map(platformTagHtml).join('');
  renderConnectedPlatforms();
  renderProfileReviews();
  renderInviteStats();

  // Stats
  const myPostCount = posts.filter(p => p.maker === myProfile.name).length;
  document.getElementById('profilePosts').textContent = myPostCount;
  document.getElementById('profileFriends').textContent = myFriends.length;
  document.getElementById('profileFollowing').textContent = '1,284';
  var xp = (currentUser && myXP) ? myXP : 0;
  document.getElementById('profileFollowers').textContent = xp + 'XP';

  // My posts
  const myPosts = posts.filter(p => p.maker === myProfile.name);
  document.getElementById('myPostsGrid').innerHTML = myPosts.length === 0
    ? '<p style="color:rgba(45,45,45,.4);padding:20px;">还没有发过帖子，去社区写一篇吧 ✍️</p>'
    : myPosts.map((p, i) => `
      <article class="post-card" style="--tilt:${randTilt(i)};--tape:${randTape(i)}" data-post-id="${escapeHtml(p.id)}">
        <span class="post-category ${escapeHtml(p.category)}">${escapeHtml(p.categoryLabel)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.desc)}</p>
        <div class="post-stats"><span>👍 ${p.likes}</span><span>💬 ${p.comments}</span><span>${escapeHtml(p.time)}</span></div>
      </article>
    `).join('');

  // Friends mini
  const friends = getFriendData().slice(0, 6);
  document.getElementById('profileFriendsMini').innerHTML = friends.map(f => `
    <div class="profile-friend-chip" onclick="switchTab('friends');setTimeout(()=>showFriendProfile('${f.id}'),200)">
      <span class="avatar" style="background:${f.avatarBg || 'var(--avatar)'}">${f.avatar}</span>
      <span>${escapeHtml(f.name)}</span>
    </div>
  `).join('') || '<p style="color:rgba(45,45,45,.4);">还没有好友，去添加一些吧 👥</p>';

  // Update settings form values
  document.getElementById('setName').value = myProfile.name;
  document.getElementById('setBio').value = myProfile.bio;
  document.getElementById('setRole').value = myProfile.role;
  document.getElementById('setCity').value = myProfile.city || '';
  document.getElementById('setWorkStatus').value = myProfile.workStatus || '';

  // Reset to home sub-view
  document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-psub="home"]').classList.add('active');
  document.getElementById('profileHome').style.display = '';
  document.getElementById('profileSettings').style.display = 'none';
}
document.getElementById('myPostsGrid').addEventListener('click', function(e) {
  var card = e.target.closest('[data-post-id]');
  if (card) openPostDetail(card.dataset.postId);
});

function saveProfile() {
  myProfile.name = document.getElementById('setName').value.trim() || myProfile.name;
  myProfile.bio = document.getElementById('setBio').value.trim() || myProfile.bio;
  myProfile.role = document.getElementById('setRole').value;
  const roleMap = { creator:'创作者 / 达人', brand:'品牌方', recruiter:'招聘方', freelancer:'自由职业者', student:'🎓 在校学生 / 应届毕业生', career_switcher:'🆕 想转行入行' };
  myProfile.roleLabel = roleMap[myProfile.role] || myProfile.roleLabel;
  myProfile.city = document.getElementById('setCity').value.trim();
  myProfile.workStatus = document.getElementById('setWorkStatus').value;

  // Get selected platforms
  const sel = document.getElementById('setPlatforms');
  myProfile.platforms = Array.from(sel.selectedOptions).map(o => o.value);

  // Get tags
  const tagsStr = document.getElementById('setTags').value.trim();
  myProfile.tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Update UI elements
  document.querySelector('.user-mini span:last-child').textContent = myProfile.name + ' ⚙';
  document.querySelector('.user-mini .avatar').textContent = myProfile.name.slice(0, 1);

  // Update my posts attribution
  posts.forEach(p => { if (p.maker === '我') { p.maker = myProfile.name; p.avatar = myProfile.name.slice(0, 1); } });

  document.getElementById('saveFeedback').textContent = '已保存！';
  document.getElementById('saveFeedback').style.color = 'var(--sage)';
  setTimeout(() => { document.getElementById('saveFeedback').textContent = ''; }, 2000);

  // Sync to userDB
  if (currentUser && userDB[currentUser]) {
    userDB[currentUser].name = myProfile.name;
    userDB[currentUser].role = myProfile.role;
    userDB[currentUser].roleLabel = myProfile.roleLabel;
    userDB[currentUser].city = myProfile.city;
    userDB[currentUser].workStatus = myProfile.workStatus;
    localStorage.setItem('creatorhub_users', JSON.stringify(userDB));
  }
  renderProfile();
  showToast('个人资料已更新');
}

// Profile subnav switching
document.querySelector('.profile-subnav').addEventListener('click', e => {
  const btn = e.target.closest('.profile-nav-btn');
  if (!btn) return;
  document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sub = btn.dataset.psub;
  document.getElementById('profileHome').style.display = sub === 'home' ? '' : 'none';
  document.getElementById('profileSettings').style.display = sub === 'settings' ? '' : 'none';
});

// ========================================
// POST DETAIL (clickable posts!)
// ========================================
let currentPostId = null;
const postComments = {}; // postId -> [{author, text, time}]

// Seed some comments
(function seedComments() {
  postComments['p1'] = [
    { author: '运营老司机', text: '补充一点：还要检查是不是被系统判定为营销内容了', time: '1小时前' },
    { author: '小红书小助手', text: '非常实用！收藏了 👏', time: '30分钟前' },
  ];
  postComments['p2'] = [
    { author: '知识博主小李', text: '谢谢大家！有问题可以评论问我', time: '3小时前' },
  ];
  postComments['p3'] = [
    { author: '品牌主理人阿Jay', text: '欢迎品牌方和达人来交流！', time: '10小时前' },
  ];
})();

function openPostDetail(postId) {
  currentPostId = postId;
  track('post_view',{post_id:postId});
  var p = posts.find(function(x){ return x.id === postId; });
  if (!p) return;
  var cmts = postComments[p.id] || [];
  var isMyPost = canDeleteOwner(p.maker);
  var pHtml = p.platform && p.platform !== 'all' ? platformTagHtml(p.platform) : '';
  document.getElementById('overlay').classList.add('show');
  document.getElementById('overlay').onclick = closePostDetail;
  var h = '<div class="post-fullview" id="postFullview">';
  h += '<button class="drawer-close" onclick="closePostDetail()" style="position:absolute;top:16px;right:16px;z-index:5;">×</button>';
  h += '<div class="post-full-head">';
  h += '<span class="post-category '+escapeHtml(p.category)+'">'+escapeHtml(p.categoryLabel)+'</span>';
  if(pHtml) h += '<div class="platform-tags" style="margin-top:8px;">'+pHtml+'</div>';
  h += '<h1 class="post-full-title">'+escapeHtml(p.title)+'</h1>';
  h += '<div class="post-full-meta"><span class="avatar" style="'+avatarStyle(p.maker)+';display:inline-grid;width:36px;height:36px;vertical-align:middle;margin-right:8px;">'+escapeHtml(p.avatar)+'</span> '+escapeHtml(p.maker)+' · '+escapeHtml(p.time)+' · 👍 '+p.likes+' · 💬 '+p.comments+'</div></div>';
  h += '<div class="post-full-body"><p>'+escapeHtml(p.desc)+'</p><p style="color:rgba(45,45,45,.5);margin-top:16px;">（完整文章...支持长文、图片、Markdown）</p></div>';
  h += '<div class="post-full-comments"><h3>💬 评论 ('+cmts.length+')</h3>';
  cmts.forEach(function(c){
    h += '<div class="comment-item"><div class="comment-avatar" style="'+avatarStyle(c.author)+'">'+escapeHtml(c.author.slice(0,1))+'</div><div class="comment-body"><b>'+escapeHtml(c.author)+'</b> <span class="comment-time">'+escapeHtml(c.time)+'</span><p>'+escapeHtml(c.text)+'</p></div></div>';
  });
  if(!cmts.length) h += '<p style="color:rgba(45,45,45,.4);">还没有评论，来说两句吧</p>';
  h += '</div>';
  h += '<div class="post-full-input"><input type="text" id="commentInput" placeholder="写下你的评论...（Enter 发送）" /><button class="btn" onclick="addComment()">发送</button><button id="likeBtn" class="btn" onclick="likePost(\''+escapeHtml(p.id)+'\')" style="margin-left:8px;">'+(isLiked(p.id)?'👍 已赞':'👍 点赞')+' ('+(p.likes||0)+')</button>';
  if(isMyPost) h += '<button class="btn" data-delete-post-id="'+escapeHtml(p.id)+'" style="background:#ffd6d6;margin-left:8px;">🗑 删除</button>';
  h += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', h);
  var deleteBtn = document.querySelector('#postFullview [data-delete-post-id]');
  if(deleteBtn)deleteBtn.addEventListener('click',function(){deletePost(this.dataset.deletePostId);closePostDetail();});
  setTimeout(function(){ var ci=document.getElementById('commentInput');if(ci)ci.focus(); },300);
}

function closePostDetail() {
  var pv=document.getElementById('postFullview');if(pv)pv.remove();
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('overlay').onclick=closeDrawer;
  currentPostId=null;
}

function addComment() {
  var input=document.getElementById('commentInput');
  if(!input||!input.value.trim()||!currentPostId)return;
  var text=input.value.trim();
  if(!postComments[currentPostId])postComments[currentPostId]=[];
  postComments[currentPostId].push({author:myProfile.name,text:text,time:'刚刚'});
  var p=posts.find(function(x){return x.id===currentPostId;});if(p)p.comments++;
  track('comment_create',{post_id:currentPostId,post_author:p?p.maker:''});
  // Notify post author (if not self)
  if(p&&p.maker&&p.maker!=='我'&&p.maker!==myProfile.name){deliverNotification(p.maker,'💬 评论了你的帖子：「'+text.slice(0,40)+(text.length>40?'...':'')+'」','社区评论');}
  addXP(10,'发表评论');
  input.value='';
  openPostDetail(currentPostId);
  showToast('评论已发布 +10XP');
}


function deletePost(postId) {
  var idx = posts.findIndex(function(p){ return p.id === postId; });
  if(idx<0)return;
  if(!canDeleteOwner(posts[idx].maker)){showToast('没有权限删除');return;}
  if (!confirm('确定要删除这条帖子吗？')) return;
  track('post_delete',{post_id:postId});
  if (idx >= 0) {
    var p = posts[idx];
    posts.splice(idx, 1);
    delete postComments[postId];
    if (currentPostId === postId) { closeDrawer(); currentPostId = null; }
    renderPosts();
    showToast('已删除：' + p.title);
  }
}

// ========================================
// ONBOARDING
// ========================================
var _onboardingStep=1;var _onboardingData={followed:[],articlesRead:[]};
var onboardingArticles=[
  {title:'电商新人如何选择赛道？抖音vs小红书vs视频号',tag:'新人必读'},
  {title:'短视频带货从0到1：新手入门完全指南',tag:'干货'},
  {title:'本地探店达人入门：一部手机就能开始',tag:'本地'},
  {title:'主播面试常见问题及注意事项',tag:'求职'},
  {title:'新手接单报价参考：行业真实数据',tag:'报价'}
];
var onboardingMentors=[
  {name:'小鹿',role:'美妆博主',desc:'小红书5.2K粉·3年创作经验'},
  {name:'大刘',role:'探店达人',desc:'抖音1.2W粉·本地推广专家'},
  {name:'阿Ken',role:'短视频编导',desc:'2年新媒体从业·帮品牌做过50+爆款'},
  {name:'周姐',role:'服装店主',desc:'淘宝店主·小红书穿搭博主'},
  {name:'王哥',role:'品牌市场经理',desc:'5年品牌投放经验·合作过200+达人'}
];
function showOnboarding(){_onboardingStep=1;_onboardingData={platforms:[],mentors:[]};var el=document.getElementById('onboardingOverlay');if(el){el.classList.add('show');el.style.display='flex';renderOnboardingStep();}}
function skipOnboarding(){var el=document.getElementById('onboardingOverlay');if(el){el.classList.remove('show');el.style.display='none';}localStorage.setItem('creatorhub_onboarding_'+currentUser,'done');sb.from('onboarding_status').upsert({username:myProfile.name,step:0,completed:true}).then(function(){});}
async function nextOnboardingStep(){if(_onboardingStep===1){var selected=document.querySelectorAll('.ob-platform-chip.selected');_onboardingData.platforms=Array.from(selected).map(function(el){return el.dataset.pid;});if(_onboardingData.platforms.length>0){myProfile.platforms=_onboardingData.platforms;sb.from('profiles').update({platforms:_onboardingData.platforms}).eq('username',currentUser).then(function(){});} _onboardingStep=2;renderOnboardingStep();return;}if(_onboardingStep===2){var mentors=document.querySelectorAll('.ob-mentor-chip.selected');_onboardingData.mentors=Array.from(mentors).map(function(el){return el.dataset.mname;});_onboardingData.mentors.forEach(function(mname){if(mname!==currentUser){sb.from('friends').insert({username:currentUser,friend_name:mname}).then(function(){});sb.from('friends').insert({username:mname,friend_name:currentUser}).then(function(){});if(myFriends.indexOf(mname)===-1)myFriends.push(mname);}});_onboardingStep=3;renderOnboardingStep();return;}if(_onboardingStep===3){await completeOnboarding();}}
function renderOnboardingStep(){var bar=document.getElementById('onboardingBar');if(bar)bar.style.width=(_onboardingStep/3*100)+'%';var content=document.getElementById('onboardingContent');var nextBtn=document.getElementById('onboardingNextBtn');if(!content||!nextBtn)return;if(_onboardingStep===1){content.innerHTML='<div class="onboarding-content-step"><h3>👋 欢迎来到 CreatorHub！</h3><p>选择你创作的平台，我们会为你推荐相关内容</p><div class="platform-chips ob-chip-grid">'+PLATFORM_OPTIONS.slice(0,7).map(function(p){return '<button type="button" class="ob-platform-chip" data-pid="'+p.id+'" onclick="this.classList.toggle(\'selected\')">'+p.name+'</button>';}).join('')+'</div></div>';nextBtn.textContent='下一步 →';}else if(_onboardingStep===2){content.innerHTML='<div class="onboarding-content-step"><h3>👥 关注推荐前辈</h3><p>这些创作者值得关注，选择一个或多个</p><div id="mentorList" class="ob-list">'+onboardingMentors.map(function(m){return '<button type="button" class="ob-mentor-chip" data-mname="'+escapeHtml(m.name)+'" onclick="this.classList.toggle(\'selected\')"><b>'+escapeHtml(m.name)+'</b> · '+escapeHtml(m.role)+'<br><small>'+escapeHtml(m.desc)+'</small></button>';}).join('')+'</div></div>';nextBtn.textContent='完成 →';}else if(_onboardingStep===3){content.innerHTML='<div class="onboarding-content-step"><h3>✨ 发布第一条帖子</h3><p>介绍一下自己，让大家认识你</p><div style="text-align:left;margin:12px 0;"><div class="form-row"><label>标题</label><input id="obPostTitle" value="新人报到！我是'+escapeHtml(currentUser)+'" /></div><div class="form-row"><label>内容</label><textarea id="obPostContent" rows="3">大家好，我是'+escapeHtml(currentUser)+'，刚刚加入 CreatorHub。希望能在这里认识更多志同道合的创作者！</textarea></div></div></div>';nextBtn.textContent='🚀 开始探索';}track('user_onboarding_view',{user_role:myProfile.role,step:_onboardingStep,completed:false});}
async function completeOnboarding(){var title=document.getElementById('obPostTitle')?document.getElementById('obPostTitle').value.trim():'';var content=document.getElementById('obPostContent')?document.getElementById('obPostContent').value.trim():'';if(title&&content)createPost(title,'newbie',content,'all');await sb.from('onboarding_status').upsert({username:myProfile.name,step:3,followed_users:_onboardingData.mentors,articles_read:_onboardingData.platforms,completed:true});localStorage.setItem('creatorhub_onboarding_'+currentUser,'done');var obEl=document.getElementById('onboardingOverlay');if(obEl){obEl.classList.remove('show');obEl.style.display='none';}showToast('欢迎加入 CreatorHub！','success');addXP(50,'完成新手引导');track('user_onboarding_complete',{followed_count:_onboardingData.mentors.length,platforms_count:_onboardingData.platforms.length});renderFriendsList();renderProfile();}

// ========================================
// INIT
// ========================================
function init() {
  ensureDealsUI();
  initHomepage();
  renderFeed();
  renderChatContacts();
  renderRecruits();
  renderMatch();
  renderPosts();
  renderFriendsList();
  renderProfile();
  updateChatBadge();
  updateFriendBadge();
}

initAuth().then(function(){loadAllData();});
