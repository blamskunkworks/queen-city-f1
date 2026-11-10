const year = new Date().getFullYear();
const api = `https://api.jolpi.ca/ergast/f1/${year}`;
const $ = (id) => document.getElementById(id);
const fmt = new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'});
const fmtTime = new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const meetup = {
  venue: 'To be announced',
  coverage: 'Race session',
  doors: 'To be announced',
  admission: 'To be announced',
  format: 'Live showing'
};
const raceBriefs = {
  'Las Vegas Grand Prix': 'A high-speed night race through the Las Vegas Strip. Watch the heavy braking zones at the end of the long straights, where slipstreaming and late moves can quickly reshuffle the order.',
  'Qatar Grand Prix': 'Fast, flowing corners place a premium on tire management and driver stamina. Long loaded turns can make strategy just as important as outright pace.',
  'Abu Dhabi Grand Prix': 'The season finale under the lights rewards traction and clean execution. Strategy often comes alive as the track cools from sunset into the night.'
};

$('season-year').textContent = year;
$('copyright-year').textContent = year;

document.querySelectorAll('.palette-chip').forEach(button=>{
  button.addEventListener('click',()=>{
    const theme=button.dataset.theme;
    document.documentElement.dataset.theme=theme;
    document.querySelectorAll('.palette-chip').forEach(chip=>{
      const selected=chip===button;
      chip.classList.toggle('active',selected);
      chip.setAttribute('aria-pressed',String(selected));
    });
  });
});

const revealObserver = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){ entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
  });
},{threshold:.12,rootMargin:'0px 0px -8%'});
document.querySelectorAll('main > section, [data-reveal]').forEach(section=>{
  section.classList.add('reveal-section');
  revealObserver.observe(section);
});

function raceDate(race){ return new Date(`${race.date}T${race.time || '12:00:00Z'}`); }
function escapeText(value){ const el=document.createElement('span'); el.textContent=value ?? ''; return el.innerHTML; }

async function getJson(url){
  const response = await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error(`Data request failed (${response.status})`);
  return response.json();
}

async function loadSchedule(){
  try{
    const data=await getJson(`${api}.json`);
    const races=data.MRData.RaceTable.Races;
    const now=new Date();
    const next=races.find(r=>raceDate(r)>now) || races[races.length-1];
    renderNext(next,races.indexOf(next)+1);
    renderMeetups(races,next);
    $('race-list').innerHTML=races.map((r,i)=>{
      const isNext=r===next;
      const completed=raceDate(r)<now;
      return `<article class="race-row${isNext?' next':''}">
        <span class="num">${String(i+1).padStart(2,'0')}</span>
        <span class="name">${escapeText(r.raceName)}${isNext?'<i class="tag">NEXT</i>':''}</span>
        <span class="location">${escapeText(r.Circuit.circuitName)} · ${escapeText(r.Circuit.Location.locality)}, ${escapeText(r.Circuit.Location.country)}</span>
        <span class="date">${completed?'Completed · ':''}${fmt.format(raceDate(r))}</span>
      </article>`;
    }).join('');
  }catch(error){
    $('race-list').innerHTML='<div class="loading-state">The live calendar is temporarily unavailable. Please refresh in a moment.</div>';
    $('data-note').textContent='Live data could not be reached. Please refresh and try again.';
    $('next-round').textContent='Live feed unavailable';
    $('next-race-title').textContent='Back on track soon';
  }
}

function renderMeetups(races,next){
  if(!next) return;
  const future=races.filter(r=>raceDate(r)>=new Date()).slice(0,4);
  const featured=$('featured-event');
  featured.querySelector('.event-status').innerHTML='<span></span> Meetup details in progress';
  featured.querySelector('.event-race h3').textContent=next.raceName;
  featured.querySelector('.event-race p').textContent=`${next.Circuit.circuitName} · ${next.Circuit.Location.locality}, ${next.Circuit.Location.country}`;
  $('meetup-venue').textContent=meetup.venue;
  $('meetup-time').textContent=fmtTime.format(raceDate(next));
  $('meetup-coverage').textContent=meetup.coverage;
  $('race-brief').textContent=raceBriefs[next.raceName] || `The next chapter of the championship unfolds at ${next.Circuit.circuitName}. Watch qualifying for track position, then follow the strategy as the race develops.`;
  $('event-amenities').innerHTML=`<li><span>Doors</span><b>${escapeText(meetup.doors)}</b></li><li><span>Admission</span><b>${escapeText(meetup.admission)}</b></li><li><span>Format</span><b>${escapeText(meetup.format)}</b></li>`;
  renderSessions(next);
  $('event-strip').innerHTML=future.map((race,index)=>`<article class="mini-event${index===0?' first':''}"><b>${String(index+1).padStart(2,'0')}</b><span><small>${fmt.format(raceDate(race))}</small><strong>${escapeText(race.raceName)}</strong><em>${index===0?'Next meetup':'Race weekend'}</em></span></article>`).join('');
}

function renderSessions(race){
  const labels=[['FirstPractice','Practice 1'],['SecondPractice','Practice 2'],['ThirdPractice','Practice 3'],['SprintQualifying','Sprint qualifying'],['Sprint','Sprint'],['Qualifying','Qualifying']];
  const sessions=labels.filter(([key])=>race[key]).map(([key,label])=>({label,date:new Date(`${race[key].date}T${race[key].time || '12:00:00Z'}`)}));
  sessions.push({label:'Grand Prix',date:raceDate(race)});
  $('session-list').innerHTML=sessions.map((session,index)=>`<div class="session-row${index===sessions.length-1?' race-session':''}"><span>${escapeText(session.label)}</span><time datetime="${session.date.toISOString()}">${fmtTime.format(session.date)}</time></div>`).join('');
}

function renderNext(race,round){
  if(!race) return;
  const start=raceDate(race);
  $('next-round').textContent=`Round ${String(round).padStart(2,'0')} · ${race.Circuit.Location.country}`;
  $('next-race-title').textContent=race.raceName;
  $('next-circuit').textContent=`${race.Circuit.circuitName} · ${race.Circuit.Location.locality}`;
  $('next-time').textContent=fmtTime.format(start);
  const tick=()=>{
    const diff=Math.max(0,start-new Date());
    const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,mins=Math.floor(diff/60000)%60;
    $('countdown').innerHTML=`<div><b>${String(days).padStart(2,'0')}</b><span>days</span></div><div><b>${String(hours).padStart(2,'0')}</b><span>hrs</span></div><div><b>${String(mins).padStart(2,'0')}</b><span>min</span></div>`;
  };
  tick(); setInterval(tick,60000);
}

async function loadStandings(){
  $('leaderboard').innerHTML='<div class="loading-state">Loading championship standings…</div>';
  try{
    const data=await getJson(`${api}/driverstandings.json`);
    const list=data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
    if(!list.length) throw new Error('No standings yet');
    $('leaderboard').innerHTML=list.slice(0,6).map(item=>`<article class="leader-row"><span class="leader-pos">${escapeText(item.position)}</span><span class="leader-name">${escapeText(item.Driver.givenName)} ${escapeText(item.Driver.familyName)}<small class="leader-team">${escapeText(item.Constructors[0]?.name || '')}</small></span><span class="leader-points">${escapeText(item.points)}<small>PTS</small></span></article>`).join('');
  }catch(error){
    $('leaderboard').innerHTML='<div class="loading-state">Standings are between sessions. Check back after the next classified race.</div>';
  }
}

$('refresh-data').addEventListener('click',loadStandings);
loadSchedule();
loadStandings();
