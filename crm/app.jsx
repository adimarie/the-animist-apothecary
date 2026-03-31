// WorkHub — The Animist Apothecary CRM
// Runs via Babel standalone (no build step). window.storage is provided by index.html.

const { useState, useEffect } = React;

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE & FONTS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  umber:"#2e1f10", umbrLt:"#4a2f18", umbrPale:"#6b4826",
  parch:"#fdf9f3", parchMd:"#f2ebe0", parchDk:"#e8dece",
  terra:"#b85c35", terraLt:"#d4785a",
  ochre:"#c8923a", ochreLt:"#d9aa5a",
  sage:"#6b8c5a", sageLt:"#8aad78", sagePale:"#c8d9be",
  rose:"#b87060", roseLt:"#cc8f7f",
  brown:"#5c3d1e", brownMd:"#7a5535", brownLt:"#a07850",
  moss:"#4a6640",
  sand:"#c9b49a", sandLt:"#e0cfbb",
  white:"#fff8f2",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Courier+Prime:wght@400;700&display=swap');
*,*::before,*::after{box-sizing:border-box;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:#ede5d5;}
::-webkit-scrollbar-thumb{background:#c4aa8c;border-radius:3px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.fade-up{animation:fadeUp 0.4s ease both;}
.pulse{animation:pulse 2.5s ease infinite;}
`;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MED_FLAGS = [
  "High Blood Pressure","Heart Arrhythmia","Heart Failure","Chest Pain / Angina",
  "Pregnancy / Postpartum","Asthma or COPD","Epilepsy / Seizure Disorder",
  "Liver or Kidney Condition","Diabetes","Stroke History","Head Injury / Concussion",
  "Family history of aneurysm","None of the above",
];
const MH_FLAGS = [
  "Depression","Anxiety","PTSD","Substance use / addiction",
  "OCD patterns","Bipolar spectrum","Personality structure patterns",
  "Psychotic / schizophrenia-spectrum","None of the above",
];
const MODALITIES = [
  "Somatic Bodywork","Sacred Breath / Luminous Breath","Divination","Plant Medicine Facilitation",
  "Medicine-Assisted Bodywork","Shamanic Guidance","Talismanic Alchemy",
  "Integration Session","Inquiry Call","Other",
];
const PRICES = {
  "Somatic Bodywork":175,"Sacred Breath / Luminous Breath":195,
  "Divination":150,"Plant Medicine Facilitation":350,
  "Medicine-Assisted Bodywork":300,"Shamanic Guidance":175,
  "Talismanic Alchemy":200,"Integration Session":145,"Inquiry Call":0,"Other":150,
};
const RESOURCES = [
  {id:"intake",   label:"Intake Form",           icon:"📋", desc:"Initial client questionnaire"},
  {id:"prep",     label:"Session Prep Guide",     icon:"🌿", desc:"Body & spirit preparation"},
  {id:"aftercare",label:"Aftercare Protocol",     icon:"🕯", desc:"Post-session integration"},
  {id:"breath",   label:"Sacred Breath Guide",    icon:"🌬", desc:"Luminous Breath foundational practices"},
  {id:"somatic",  label:"Somatic Orientation",    icon:"🤲", desc:"Introduction to somatic awareness"},
  {id:"mythic",   label:"Mythic Being Guide",     icon:"✦",  desc:"Personal mythic development"},
  {id:"mentorship",label:"Mentorship Overview",   icon:"🌙", desc:"Long-arc container agreements"},
  {id:"ceremony", label:"Ceremonial Agreements",  icon:"🔥", desc:"Sacred container protocols"},
];
const AUTO_FLOWS = {
  "single":[
    {step:"Booking confirmed",      action:"Send intake form + ceremonial preparation guide",         delay:"Immediate"},
    {step:"24h before session",     action:"Reminder + session intentions prompt",                    delay:"Auto"},
    {step:"Session complete",       action:"Integration notes + plant medicine resource pack",         delay:"+2h"},
    {step:"+3 days",                action:"Personal follow-up check-in",                             delay:"+3d"},
    {step:"+7 days",                action:"Offer continuation pathways — arc or community sit",       delay:"+7d"},
    {step:"+21 days",               action:"Seasonal community sit invitation",                        delay:"+21d"},
  ],
  "arc":[
    {step:"Contract signed",        action:"Onboarding portal access + welcome ceremony sequence",    delay:"Immediate"},
    {step:"48h before each session",action:"Reflection & somatic preparation prompt",                 delay:"48h prior"},
    {step:"Post-session",           action:"Session notes + homework + integration ritual guide",      delay:"+24h"},
    {step:"Phase transition",       action:"Phase ceremony guide + updated arc roadmap",              delay:"On milestone"},
    {step:"Monthly",                action:"Arc synthesis email + progress weaving",                  delay:"Monthly"},
    {step:"30d before renewal",     action:"Continuation offer + arc review + next phase seeding",   delay:"30d before end"},
    {step:"Final session",          action:"Completion ceremony guide + alumni community invitation", delay:"Completion"},
  ],
  "sit":[
    {step:"Registration opens",     action:"Announce across all channels + waitlist link",            delay:"2 wks prior"},
    {step:"Registered",             action:"Preparation guide + what to bring + land acknowledgment", delay:"Immediate"},
    {step:"48h before",             action:"Reminder + intention-setting practice",                   delay:"Auto"},
    {step:"Post-sit",               action:"Integration notes + recording if available",              delay:"+24h"},
    {step:"+5 days",                action:"Invite to ongoing group arc or 1:1 session",              delay:"+5d"},
  ],
  "group":[
    {step:"Group forms",            action:"Welcome packet + group agreements + portal access",       delay:"Immediate"},
    {step:"48h pre-session",        action:"Weekly preparation prompt sent to all members",           delay:"48h prior"},
    {step:"Post-session",           action:"Collective session notes + individual reflection prompts",delay:"+24h"},
    {step:"Phase transition",       action:"Group ceremony + next phase orientation ritual",          delay:"On milestone"},
    {step:"Mid-point",              action:"Individual 1:1 check-ins with each member",              delay:"Mid-point"},
    {step:"Final session",          action:"Harvest ceremony guide + alumni container invitation",    delay:"Completion"},
  ],
  "travel":[
    {step:"Date confirmed",         action:"Host briefing pack + logistics checklist",               delay:"8 wks prior"},
    {step:"6 wks prior",            action:"Registration opens + regional social announcement",       delay:"6 wks prior"},
    {step:"2 wks prior",            action:"Pre-workshop preparation guide to all registered",        delay:"2 wks prior"},
    {step:"Post-workshop",          action:"Integration pack + local follow-up offerings",            delay:"+48h"},
    {step:"+2 weeks",               action:"Local community sit offering while still in region",      delay:"+2 wk"},
    {step:"Departure",              action:"Newsletter update + next visit date pre-announced",       delay:"On departure"},
    {step:"3 months out",           action:"Return visit activation to all region contacts",          delay:"3mo prior"},
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS — backed by window.storage (Supabase shim in index.html)
// ─────────────────────────────────────────────────────────────────────────────
async function loadClients() {
  try { const r = await window.storage.get("crm:clients"); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveClients(c) {
  try { await window.storage.set("crm:clients", JSON.stringify(c)); } catch {}
}
async function loadGroups() {
  try { const r = await window.storage.get("hub:groups"); return r ? JSON.parse(r.value) : SAMPLE_GROUPS; }
  catch { return SAMPLE_GROUPS; }
}
async function saveGroups(g) {
  try { await window.storage.set("hub:groups", JSON.stringify(g)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_GROUPS = [
  {id:"g1", name:"Moonwoven Council",  type:"council",   members:7,  nextMeet:"2026-03-21", status:"active",  notes:"Full moon gathering, Topanga"},
  {id:"g2", name:"Sunforged Circle",   type:"council",   members:5,  nextMeet:"2026-04-04", status:"active",  notes:"New moon, focused shadow work"},
  {id:"g3", name:"Healer's Sanctuary", type:"community", members:12, nextMeet:"2026-03-28", status:"active",  notes:"Monthly drop-in container"},
  {id:"g4", name:"Celestial Lab",      type:"lab",       members:4,  nextMeet:"2026-04-12", status:"forming", notes:"Earth-born technologies cohort"},
];
const CIRCUIT = [
  {id:"c1", location:"Topanga Canyon, CA",  type:"home base",  dates:"Ongoing",    status:"active",    notes:"The Haven studio"},
  {id:"c2", location:"Big Sur, CA",         type:"retreat",    dates:"May 2026",   status:"confirmed", notes:"3-day immersion, coastal site"},
  {id:"c3", location:"Joshua Tree, CA",     type:"gathering",  dates:"Jun 2026",   status:"tentative", notes:"Desert ceremony circuit"},
  {id:"c4", location:"Oaxaca, MX",          type:"pilgrimage", dates:"Oct 2026",   status:"planning",  notes:"Ancestral medicine work"},
  {id:"c5", location:"San Francisco, CA",   type:"workshop",   dates:"Aug 2026",   status:"confirmed", notes:"Urban community offering"},
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
function Pill({label, color=C.terra}) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 10px", borderRadius:20,
      background:color+"22", border:`1px solid ${color}55`,
      color, fontSize:11, fontFamily:"'Courier Prime',monospace",
      letterSpacing:"0.03em", whiteSpace:"nowrap",
    }}>{label}</span>
  );
}
function SectionHead({children, accent=C.terra}) {
  return (
    <div style={{
      fontFamily:"'Playfair Display',serif", fontSize:13, fontStyle:"italic",
      color:accent, letterSpacing:"0.04em", marginBottom:10, marginTop:24,
      borderBottom:`1px solid ${accent}33`, paddingBottom:4,
    }}>{children}</div>
  );
}
const inputStyle = {
  width:"100%", boxSizing:"border-box",
  background:C.parchMd, border:`1px solid ${C.sand}`,
  borderRadius:6, padding:"7px 10px",
  fontFamily:"'EB Garamond',serif", fontSize:14, color:C.brown,
  outline:"none", resize:"vertical",
};
function Field({label, value, onChange, type="text", placeholder="", rows}) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.brownMd,marginBottom:3,letterSpacing:"0.05em"}}>{label}</div>
      {rows
        ? <textarea rows={rows} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...inputStyle,resize:undefined}} />}
    </div>
  );
}
function CheckGroup({options, selected, onChange, columns=2}) {
  function toggle(opt) { onChange(selected.includes(opt)?selected.filter(x=>x!==opt):[...selected,opt]); }
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${columns},1fr)`,gap:"4px 16px",marginBottom:12}}>
      {options.map(opt=>(
        <label key={opt} style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brown,cursor:"pointer"}}>
          <input type="checkbox" checked={selected.includes(opt)} onChange={()=>toggle(opt)} style={{accentColor:C.terra}} />
          {opt}
        </label>
      ))}
    </div>
  );
}
function SelectField({label, value, onChange, options}) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.brownMd,marginBottom:3,letterSpacing:"0.05em"}}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{...inputStyle,height:36,resize:undefined}}>
        <option value="">— select —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Btn({children, onClick, color=C.terra, outline=false, small=false}) {
  return (
    <button onClick={onClick} style={{
      background:outline?"transparent":color, color:outline?color:C.white,
      border:`1.5px solid ${color}`, borderRadius:6,
      padding:small?"5px 14px":"8px 20px",
      fontFamily:"'Courier Prime',monospace", fontSize:small?11:13,
      cursor:"pointer", letterSpacing:"0.04em", transition:"opacity 0.15s",
    }}
    onMouseEnter={e=>e.target.style.opacity=0.8}
    onMouseLeave={e=>e.target.style.opacity=1}
    >{children}</button>
  );
}
function StatCard({value, label, color=C.terra}) {
  return (
    <div style={{background:C.white,borderRadius:10,padding:"18px 22px",border:`1px solid ${C.sandLt}`,textAlign:"center"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color,fontStyle:"italic"}}>{value}</div>
      <div style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.brownMd,letterSpacing:"0.08em",marginTop:4}}>{label}</div>
    </div>
  );
}
function PhaseTrack({phase, phases, color}) {
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        {phases.map((_,i)=>(
          <div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=phase?color:C.sandLt,transition:"background 0.3s"}} />
        ))}
      </div>
      <div style={{fontSize:10,color:C.brownMd,fontFamily:"'Courier Prime',monospace",letterSpacing:"0.04em"}}>
        Phase {phase+1}/{phases.length} — {phases[phase]}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA FACTORIES
// ─────────────────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function emptyClient() {
  return {
    id:uid(), createdAt:new Date().toISOString(),
    type:"single", status:"active",
    firstName:"", lastName:"", dob:"", email:"", phone:"",
    pronouns:"", languages:"",
    howFound:"", messagingApp:"", appUsername:"",
    country:"", region:"",
    ec1Name:"", ec1Relation:"", ec1Phone:"", ec1Email:"", ec2:"",
    medFlags:[], medFlagsOther:"", medConditions:"", accidents:"",
    hospitalizations:"", headInjuries:"", aneurysmHistory:"",
    allergiesMeds:"", allergiesEnv:"", allergiesOther:"",
    mhFlags:[], mhFlagsOther:"", mhHistory:"", traumaHistory:"", suicidalityScreen:"",
    rxMeds:"", otcSupplements:"", tobaccoRelation:"", alcoholRelation:"",
    caffeineRelation:"", cannabisRelation:"",
    sessionIntention:"", practitionerNotes:"",
    resources:{}, deepDive:null, sessions:[],
  };
}
function emptyDeepDive() {
  return {
    spiritualOrientation:"", earthRelation:"", lineages:"",
    expandedStatePractices:"", ritualRelation:"", deathRelation:"", ceremonialSafety:"",
    entheoHistory:"", entheoHard:"", entheoImpact:"", entheoHesitations:"",
    anxiety:"", helplessness:"", stress:"", memory:"", lowMood:"", loneliness:"",
    archetypes:"", lifeChapter:"", shifting:"", intention:"", hopes:"", releasing:"",
    closingThoughts:"",
  };
}
function emptySession() {
  return {
    id:uid(), date:new Date().toISOString().slice(0,10),
    modality:"", amount:"", intention:"", sessionNotes:"",
    aftercare:"", integrationNotes:"", followUp:"",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW VIEW
// ─────────────────────────────────────────────────────────────────────────────
function OverviewView({clients, groups, onNav}) {
  const arcClients = clients.filter(c=>c.type==="arc");
  const flagged = clients.filter(c=>[...c.medFlags,...c.mhFlags].some(f=>f!=="None of the above"));
  const recentSessions = clients
    .flatMap(c=>c.sessions.map(s=>({...s,clientName:`${c.firstName} ${c.lastName}`,clientId:c.id})))
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const totalRevenue = clients.reduce((sum,c)=>sum+c.sessions.reduce((s2,sess)=>s2+(parseFloat(sess.amount)||0),0),0);

  return (
    <div className="fade-up">
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontStyle:"italic",color:C.brown,marginBottom:6}}>
        Good day, Adi.
      </div>
      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,marginBottom:28,lineHeight:1.6}}>
        Your practice at a glance — the full weave of what you're holding.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:28}}>
        <StatCard value={clients.length}              label="TOTAL CLIENTS"    color={C.terra} />
        <StatCard value={arcClients.length}           label="ARC CLIENTS"      color={C.ochre} />
        <StatCard value={clients.length-arcClients.length} label="SINGLE SESSION" color={C.sage} />
        <StatCard value={groups.length}               label="ACTIVE GROUPS"    color={C.rose} />
        <StatCard value={CIRCUIT.filter(s=>s.status==="confirmed").length} label="CIRCUIT CONFIRMED" color={C.brownLt} />
        <StatCard value={`$${Math.round(totalRevenue).toLocaleString()}`} label="TOTAL EARNED" color={C.moss} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:C.brown,marginBottom:14}}>
            Recent Sessions
          </div>
          {recentSessions.length===0
            ? <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,fontStyle:"italic"}}>No sessions logged yet.</div>
            : recentSessions.map(s=>(
              <div key={s.id} style={{borderBottom:`1px solid ${C.parchDk}`,paddingBottom:10,marginBottom:10,cursor:"pointer"}}
                onClick={()=>onNav(s.clientId)}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown}}>{s.clientName}</div>
                  <div style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.brownMd}}>{s.date}</div>
                </div>
                {s.modality && <Pill label={s.modality} color={C.sage} />}
              </div>
            ))
          }
        </div>

        <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:C.brown,marginBottom:14}}>
            Upcoming Groups
          </div>
          {groups.filter(g=>g.status==="active").map(g=>(
            <div key={g.id} style={{borderBottom:`1px solid ${C.parchDk}`,paddingBottom:10,marginBottom:10}}>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown}}>{g.name}</div>
              <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                <Pill label={g.type} color={C.rose} />
                <div style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.brownMd}}>{g.nextMeet}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {flagged.length>0 && (
        <div style={{marginTop:20,background:`${C.terra}11`,border:`1px solid ${C.terra}44`,borderRadius:10,padding:"14px 18px"}}>
          <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.terra,letterSpacing:"0.06em",marginBottom:8}}>
            ⚠ CLIENTS WITH ACTIVE FLAGS
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {flagged.map(c=>(
              <div key={c.id} style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,cursor:"pointer",
                textDecoration:"underline",textDecorationColor:C.terra+"88"}}
                onClick={()=>onNav(c.id)}>
                {c.firstName} {c.lastName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTAKE FORM
// ─────────────────────────────────────────────────────────────────────────────
function IntakeForm({initial, onSave, onCancel}) {
  const [d, setD] = useState(initial||emptyClient());
  const [showDeep, setShowDeep] = useState(!!initial?.deepDive);
  const [dd, setDd] = useState(initial?.deepDive||emptyDeepDive());
  const [step, setStep] = useState(0);
  function up(key) { return val=>setD(p=>({...p,[key]:val})); }
  function udd(key) { return val=>setDd(p=>({...p,[key]:val})); }
  const steps = ["Contact","Medical","Mind & Mood","Medications","Intention",...(showDeep?["Deep Dive"]:[])];

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {steps.map((s,i)=>(
          <div key={i} onClick={()=>setStep(i)} style={{
            padding:"4px 12px",borderRadius:20,cursor:"pointer",
            background:step===i?C.terra:C.parchDk,
            color:step===i?C.white:C.brownMd,
            fontFamily:"'Courier Prime',monospace",fontSize:11,
            border:`1px solid ${step===i?C.terra:C.sand}`,
          }}>{s}</div>
        ))}
      </div>

      {step===0 && <>
        <SectionHead>Contact & Logistics</SectionHead>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Field label="FIRST NAME *"          value={d.firstName}   onChange={up("firstName")} />
          <Field label="LAST NAME *"           value={d.lastName}    onChange={up("lastName")} />
          <Field label="DATE OF BIRTH *"       value={d.dob}         onChange={up("dob")} placeholder="MM/DD/YYYY" />
          <Field label="PRONOUNS"              value={d.pronouns}    onChange={up("pronouns")} />
          <Field label="EMAIL *"               value={d.email}       onChange={up("email")} type="email" />
          <Field label="PHONE (country code)*" value={d.phone}       onChange={up("phone")} />
          <Field label="COUNTRY"               value={d.country}     onChange={up("country")} />
          <Field label="STATE / REGION"        value={d.region}      onChange={up("region")} />
        </div>
        <Field label="LANGUAGES" value={d.languages} onChange={up("languages")} />
        <Field label="HOW DID YOU FIND THIS WORK?" value={d.howFound} onChange={up("howFound")} rows={2} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Field label="SECURE MESSAGING APP"  value={d.messagingApp}  onChange={up("messagingApp")} placeholder="Signal / Wire / WhatsApp" />
          <Field label="APP USERNAME"          value={d.appUsername}   onChange={up("appUsername")} />
        </div>
        <SectionHead>Emergency Contact</SectionHead>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Field label="EC NAME *"       value={d.ec1Name}     onChange={up("ec1Name")} />
          <Field label="RELATIONSHIP *"  value={d.ec1Relation} onChange={up("ec1Relation")} />
          <Field label="EC PHONE *"      value={d.ec1Phone}    onChange={up("ec1Phone")} />
          <Field label="EC EMAIL"        value={d.ec1Email}    onChange={up("ec1Email")} />
        </div>
        <Field label="SECOND EMERGENCY CONTACT" value={d.ec2} onChange={up("ec2")} rows={2} placeholder="Name, relationship, phone" />
        <SelectField label="CLIENT TYPE" value={d.type} onChange={up("type")} options={["single","arc"]} />
      </>}

      {step===1 && <>
        <SectionHead accent={C.terra}>Medical Flags — check all that apply</SectionHead>
        <CheckGroup options={MED_FLAGS} selected={d.medFlags} onChange={v=>setD(p=>({...p,medFlags:v}))} />
        <Field label="OTHER / ADDITIONAL MEDICAL NOTES"   value={d.medFlagsOther}  onChange={up("medFlagsOther")} rows={2} />
        <Field label="MEDICAL CONDITIONS — in your own words" value={d.medConditions} onChange={up("medConditions")} rows={3} />
        <Field label="MAJOR ACCIDENTS / INJURIES"         value={d.accidents}      onChange={up("accidents")} rows={2} />
        <Field label="HOSPITALIZATIONS / SURGERIES"       value={d.hospitalizations} onChange={up("hospitalizations")} rows={2} />
        <Field label="HEAD INJURIES / CONCUSSIONS"        value={d.headInjuries}   onChange={up("headInjuries")} rows={2} />
        <Field label="FAMILY HISTORY OF ANEURYSM"         value={d.aneurysmHistory} onChange={up("aneurysmHistory")} />
        <SectionHead accent={C.rose}>Allergies & Sensitivities</SectionHead>
        <Field label="MEDICATION ALLERGIES"                          value={d.allergiesMeds}  onChange={up("allergiesMeds")} rows={2} />
        <Field label="FOOD / PLANT / ENVIRONMENTAL SENSITIVITIES"   value={d.allergiesEnv}   onChange={up("allergiesEnv")} rows={2} />
        <Field label="OTHER NOTES"                                   value={d.allergiesOther} onChange={up("allergiesOther")} />
      </>}

      {step===2 && <>
        <SectionHead accent={C.rose}>Mental & Emotional Health</SectionHead>
        <Field label="OVERALL MENTAL HEALTH — how you'd describe it now" value={d.mhHistory} onChange={up("mhHistory")} rows={3} />
        <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.brownMd,marginBottom:6,letterSpacing:"0.05em"}}>
          MENTAL HEALTH HISTORY — check all that apply
        </div>
        <CheckGroup options={MH_FLAGS} selected={d.mhFlags} onChange={v=>setD(p=>({...p,mhFlags:v}))} />
        <Field label="OTHER"                                                       value={d.mhFlagsOther}    onChange={up("mhFlagsOther")} />
        <Field label="TRAUMA HISTORY — what feels important to name"              value={d.traumaHistory}   onChange={up("traumaHistory")} rows={3} />
        <Field label="SUICIDALITY / SELF-HARM — history and where things are now" value={d.suicidalityScreen} onChange={up("suicidalityScreen")} rows={3} />
      </>}

      {step===3 && <>
        <SectionHead accent={C.ochre}>Medications & Substances</SectionHead>
        <Field label="PRESCRIPTION MEDICATIONS (name, dose, frequency, duration)" value={d.rxMeds}          onChange={up("rxMeds")} rows={4} placeholder="If none, write 'none'" />
        <Field label="OTC / SUPPLEMENTS / HERBAL PRODUCTS"                        value={d.otcSupplements}  onChange={up("otcSupplements")} rows={3} placeholder="If none, write 'none'" />
        <Field label="TOBACCO"    value={d.tobaccoRelation}  onChange={up("tobaccoRelation")} rows={2} />
        <Field label="ALCOHOL"    value={d.alcoholRelation}  onChange={up("alcoholRelation")} rows={2} />
        <Field label="CAFFEINE"   value={d.caffeineRelation} onChange={up("caffeineRelation")} rows={2} />
        <Field label="CANNABIS"   value={d.cannabisRelation} onChange={up("cannabisRelation")} rows={2} />
      </>}

      {step===4 && <>
        <SectionHead accent={C.sage}>Session Intention</SectionHead>
        <Field label="WHAT BRINGS YOU TO THIS WORK TODAY?" value={d.sessionIntention}
          onChange={up("sessionIntention")} rows={5} placeholder="In whatever language comes most naturally…" />
        {!showDeep && (
          <div style={{background:C.parchDk,borderRadius:8,padding:16,border:`1px solid ${C.sand}`,marginTop:16}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontStyle:"italic",color:C.brown,marginBottom:8}}>✦ Optional: Deep Dive Questions</div>
            <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,lineHeight:1.6,marginBottom:12}}>
              For clients going deeper, or considering arc work — spiritual orientation, sacred medicine history,
              developmental landscape, and trajectory. Not required for a single session.
            </div>
            <Btn outline color={C.sage} onClick={()=>{setShowDeep(true);setStep(5);}}>Open Deep Dive Questions →</Btn>
          </div>
        )}
      </>}

      {step===5 && showDeep && <>
        <SectionHead accent={C.sage}>Spirit, Meaning & Cosmology</SectionHead>
        <Field label="SPIRITUAL / ONTOLOGICAL ORIENTATION"                          value={dd.spiritualOrientation}   onChange={udd("spiritualOrientation")} rows={3} />
        <Field label="RELATIONSHIP WITH THE LIVING EARTH & MORE-THAN-HUMAN WORLD"  value={dd.earthRelation}          onChange={udd("earthRelation")} rows={3} />
        <Field label="LINEAGES / TRADITIONS / ANCESTRAL PRACTICES"                  value={dd.lineages}               onChange={udd("lineages")} rows={3} />
        <Field label="EXPANDED STATE PRACTICES (meditation, breathwork, trance, ceremony)" value={dd.expandedStatePractices} onChange={udd("expandedStatePractices")} rows={3} />
        <Field label="RELATIONSHIP WITH RITUAL, PRAYER, SONG, MYTHIC LANGUAGE"     value={dd.ritualRelation}         onChange={udd("ritualRelation")} rows={3} />
        <Field label="HOW YOU RELATE TO LIFE, DEATH, AND WHAT MAY FOLLOW"          value={dd.deathRelation}          onChange={udd("deathRelation")} rows={3} />
        <Field label="WHAT HELPS YOU FEEL SPIRITUALLY SAFE IN CEREMONY"             value={dd.ceremonialSafety}       onChange={udd("ceremonialSafety")} rows={3} />
        <SectionHead accent={C.ochre}>Sacred Medicine & Specialized State History</SectionHead>
        <Field label="HISTORY WITH ANCESTRAL SACRED MEDICINES (what, how many times, settings)" value={dd.entheoHistory} onChange={udd("entheoHistory")} rows={4} />
        <Field label="DIFFICULT OR DESTABILIZING EXPERIENCES"  value={dd.entheoHard}       onChange={udd("entheoHard")} rows={3} />
        <Field label="OVERALL IMPACT ON YOUR LIFE"             value={dd.entheoImpact}     onChange={udd("entheoImpact")} rows={3} />
        <Field label="CONCERNS, QUESTIONS, OR HESITATIONS"    value={dd.entheoHesitations} onChange={udd("entheoHesitations")} rows={3} />
        <SectionHead>Developmental Landscape</SectionHead>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Field label="ANXIETY RELATIONSHIP"      value={dd.anxiety}      onChange={udd("anxiety")} rows={2} />
          <Field label="HELPLESSNESS"              value={dd.helplessness} onChange={udd("helplessness")} rows={2} />
          <Field label="STRESS RESPONSE"           value={dd.stress}       onChange={udd("stress")} rows={2} />
          <Field label="MEMORY & MENTAL CLARITY"  value={dd.memory}       onChange={udd("memory")} rows={2} />
          <Field label="LOW MOOD / HEAVINESS"     value={dd.lowMood}      onChange={udd("lowMood")} rows={2} />
          <Field label="LONELINESS"               value={dd.loneliness}   onChange={udd("loneliness")} rows={2} />
        </div>
        <SectionHead accent={C.sage}>Trajectory — Where You're Heading</SectionHead>
        <Field label="ARCHETYPES / ROLES CALLING YOU FORWARD"       value={dd.archetypes}  onChange={udd("archetypes")} rows={3} />
        <Field label="THE CHAPTER YOU ARE IN"                       value={dd.lifeChapter} onChange={udd("lifeChapter")} rows={2} />
        <Field label="WHAT IS SHIFTING, LOOSENING, BEGINNING"       value={dd.shifting}    onChange={udd("shifting")} rows={3} />
        <Field label="INTENTION FOR THIS WORK"                      value={dd.intention}   onChange={udd("intention")} rows={3} />
        <Field label="WHAT YOU HOPE COULD GROW OR OPEN"            value={dd.hopes}       onChange={udd("hopes")} rows={3} />
        <Field label="WHAT YOU HOPE COULD SOFTEN OR FALL AWAY"     value={dd.releasing}   onChange={udd("releasing")} rows={3} />
        <SectionHead>Closing Space</SectionHead>
        <Field label="ANYTHING THAT HASN'T HAD A PLACE TO LAND"    value={dd.closingThoughts} onChange={udd("closingThoughts")} rows={4} />
      </>}

      <div style={{display:"flex",justifyContent:"space-between",marginTop:24,gap:8}}>
        <Btn outline color={C.brownMd} onClick={onCancel}>Cancel</Btn>
        <div style={{display:"flex",gap:8}}>
          {step>0 && <Btn outline color={C.brown} onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
          {step<steps.length-1
            ? <Btn color={C.terra} onClick={()=>setStep(s=>s+1)}>Continue →</Btn>
            : <Btn color={C.sage} onClick={()=>onSave({...d,deepDive:showDeep?dd:null})}>✦ Save Client</Btn>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION FORM
// ─────────────────────────────────────────────────────────────────────────────
function SessionForm({onSave, onCancel}) {
  const [s, setS] = useState(emptySession());
  function up(k) { return v=>setS(p=>({...p,[k]:v})); }
  function handleModality(v) {
    setS(p=>({...p, modality:v, amount:p.amount||(PRICES[v]||"").toString()}));
  }
  return (
    <div>
      <SectionHead accent={C.sage}>New Session Entry</SectionHead>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 16px"}}>
        <Field label="DATE" value={s.date} onChange={up("date")} type="date" />
        <SelectField label="MODALITY" value={s.modality} onChange={handleModality} options={MODALITIES} />
        <Field label="AMOUNT ($ received)" value={s.amount} onChange={up("amount")} placeholder={s.modality?`Suggested: ${PRICES[s.modality]||"—"}`:"$"} />
      </div>
      <Field label="CLIENT'S INTENTION"                                              value={s.intention}      onChange={up("intention")} rows={3} />
      <Field label="SESSION NOTES (observations, what arose, somatic patterns)"     value={s.sessionNotes}   onChange={up("sessionNotes")} rows={5} />
      <Field label="AFTERCARE GIVEN"                                                 value={s.aftercare}      onChange={up("aftercare")} rows={2} />
      <Field label="INTEGRATION THREADS TO CARRY FORWARD"                           value={s.integrationNotes} onChange={up("integrationNotes")} rows={3} />
      <Field label="FOLLOW-UP / NEXT STEPS"                                         value={s.followUp}       onChange={up("followUp")} rows={2} />
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
        <Btn outline color={C.brownMd} onClick={onCancel}>Cancel</Btn>
        <Btn color={C.sage} onClick={()=>onSave(s)}>Save Session</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT DOSSIER
// ─────────────────────────────────────────────────────────────────────────────
function ClientDossier({client, onUpdate, onBack}) {
  const [tab, setTab] = useState("overview");
  const [addingSession, setAddingSession] = useState(false);
  const [editingIntake, setEditingIntake] = useState(false);
  const [editNote, setEditNote] = useState(client.practitionerNotes||"");
  const TABS = ["overview","health & safety","intake","session log","resources","notes"];
  const dangerFlags = [
    ...client.medFlags.filter(f=>f!=="None of the above"),
    ...client.mhFlags.filter(f=>f!=="None of the above"),
  ];

  function toggleResource(id) {
    const res = {...(client.resources||{})};
    if (res[id]) delete res[id];
    else res[id] = new Date().toISOString();
    onUpdate({...client,resources:res});
  }

  if (editingIntake) return (
    <div style={{padding:24}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:C.brown,marginBottom:20}}>
        Edit Intake — {client.firstName} {client.lastName}
      </div>
      <IntakeForm initial={client} onSave={c=>{onUpdate(c);setEditingIntake(false);}} onCancel={()=>setEditingIntake(false)} />
    </div>
  );

  return (
    <div>
      <div style={{background:C.umber,padding:"20px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.sand,cursor:"pointer",
            fontFamily:"'Courier Prime',monospace",fontSize:11,marginBottom:6,letterSpacing:"0.05em"}}>
            ← All Clients
          </button>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.white,fontStyle:"italic"}}>
            {client.firstName} {client.lastName}
          </div>
          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
            <Pill label={client.type==="arc"?"Developmental Arc":"Single Session"} color={client.type==="arc"?C.ochre:C.sage} />
            <Pill label={client.status} color={C.sand} />
            {client.deepDive && <Pill label="Deep Dive On File" color={C.rose} />}
            {dangerFlags.length>0 && <Pill label={`${dangerFlags.length} flag${dangerFlags.length>1?"s":""}`} color={C.terra} />}
            {Object.keys(client.resources||{}).length>0 && (
              <Pill label={`${Object.keys(client.resources).length} resources sent`} color={C.brownLt} />
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn small outline color={C.sand} onClick={()=>setEditingIntake(true)}>Edit Intake</Btn>
          <Btn small color={C.sage} onClick={()=>setAddingSession(true)}>+ Session</Btn>
        </div>
      </div>

      <div style={{background:C.parchDk,borderBottom:`1px solid ${C.sandLt}`,display:"flex",gap:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            background:tab===t?C.parch:"transparent",
            border:"none",borderBottom:tab===t?`2px solid ${C.terra}`:"2px solid transparent",
            padding:"10px 18px",cursor:"pointer",
            fontFamily:"'Courier Prime',monospace",fontSize:11,
            color:tab===t?C.terra:C.brownMd,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap",
          }}>{t}</button>
        ))}
      </div>

      <div style={{padding:"20px 28px",background:C.parch,minHeight:400}}>
        {addingSession && (
          <SessionForm
            onSave={s=>{onUpdate({...client,sessions:[...client.sessions,s]});setAddingSession(false);}}
            onCancel={()=>setAddingSession(false)} />
        )}

        {!addingSession && tab==="overview" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <SectionHead>Contact</SectionHead>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,lineHeight:1.9,color:C.brown}}>
                {[
                  ["Email",client.email],["Phone",client.phone],["DOB",client.dob],
                  ["Pronouns",client.pronouns],
                  ["Location",[client.region,client.country].filter(Boolean).join(", ")],
                  ["Languages",client.languages],
                  ["Messaging",[client.messagingApp,client.appUsername&&`(${client.appUsername})`].filter(Boolean).join(" ")],
                ].map(([k,v])=>v?<div key={k}><strong>{k}:</strong> {v}</div>:null)}
              </div>
              <SectionHead>Emergency Contact</SectionHead>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,lineHeight:1.8,color:C.brown}}>
                <div>{client.ec1Name} — {client.ec1Relation}</div>
                <div>{client.ec1Phone}</div>
                {client.ec2 && <div style={{marginTop:4,color:C.brownMd,fontSize:13}}>{client.ec2}</div>}
              </div>
            </div>
            <div>
              {dangerFlags.length>0 && <>
                <SectionHead accent={C.terra}>⚠ Active Flags</SectionHead>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
                  {dangerFlags.map(f=><Pill key={f} label={f} color={C.terra} />)}
                </div>
              </>}
              {client.allergiesEnv && <>
                <SectionHead accent={C.rose}>Allergies / Sensitivities</SectionHead>
                <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brown,lineHeight:1.6}}>{client.allergiesEnv}</div>
              </>}
              <SectionHead accent={C.sage}>Session Intention</SectionHead>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,fontStyle:"italic",color:C.brown,lineHeight:1.7}}>
                {client.sessionIntention||"—"}
              </div>
              <SectionHead>Sessions</SectionHead>
              <div style={{fontFamily:"'Courier Prime',monospace",fontSize:13,color:C.brownMd}}>
                {client.sessions.length} session{client.sessions.length!==1?"s":""} on record
                {client.sessions.some(s=>s.amount) && (
                  <span style={{marginLeft:8,color:C.moss}}>
                    · ${client.sessions.reduce((s,sess)=>s+(parseFloat(sess.amount)||0),0).toLocaleString()} earned
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {!addingSession && tab==="health & safety" && (
          <div>
            <SectionHead accent={C.terra}>Medical Flags</SectionHead>
            {client.medFlags.length>0
              ? <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {client.medFlags.map(f=><Pill key={f} label={f} color={f==="None of the above"?C.sage:C.terra} />)}
                </div>
              : <div style={{color:C.brownMd,fontFamily:"'EB Garamond',serif",fontSize:14}}>None indicated.</div>}
            {client.medConditions && <>
              <SectionHead>Medical Conditions</SectionHead>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,lineHeight:1.7}}>{client.medConditions}</div>
            </>}
            {client.rxMeds && <>
              <SectionHead accent={C.ochre}>Prescription Medications</SectionHead>
              <div style={{fontFamily:"'Courier Prime',monospace",fontSize:12,color:C.brown,
                background:C.parchMd,padding:12,borderRadius:6,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{client.rxMeds}</div>
            </>}
            <SectionHead accent={C.rose}>Mental Health Flags</SectionHead>
            {client.mhFlags.length>0
              ? <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {client.mhFlags.map(f=><Pill key={f} label={f} color={f==="None of the above"?C.sage:C.rose} />)}
                </div>
              : <div style={{color:C.brownMd,fontFamily:"'EB Garamond',serif",fontSize:14}}>None indicated.</div>}
            {client.suicidalityScreen && <>
              <SectionHead accent={C.rose}>Suicidality / Self-Harm Screen</SectionHead>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,lineHeight:1.7}}>{client.suicidalityScreen}</div>
            </>}
            <SectionHead>Allergies & Sensitivities</SectionHead>
            <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,lineHeight:1.7}}>
              {[client.allergiesMeds,client.allergiesEnv,client.allergiesOther].filter(Boolean).join(" · ")||"None indicated."}
            </div>
          </div>
        )}

        {!addingSession && tab==="intake" && (
          <div>
            {[
              {h:"Session Intention",v:client.sessionIntention},
              {h:"Medical Conditions",v:client.medConditions},
              {h:"Accidents / Injuries",v:client.accidents},
              {h:"Mental Health History",v:client.mhHistory},
              {h:"Tobacco",v:client.tobaccoRelation},
              {h:"Alcohol",v:client.alcoholRelation},
              {h:"Cannabis",v:client.cannabisRelation},
            ].filter(x=>x.v).map(x=>(
              <div key={x.h}>
                <SectionHead>{x.h}</SectionHead>
                <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,lineHeight:1.7}}>{x.v}</div>
              </div>
            ))}
            {client.deepDive && <>
              <div style={{marginTop:24,padding:"12px 16px",background:C.parchDk,borderRadius:8,
                border:`1px solid ${C.sand}`,fontFamily:"'Playfair Display',serif",fontSize:14,fontStyle:"italic",color:C.brownMd}}>
                ✦ Deep Dive Responses On File
              </div>
              {[
                {h:"Spiritual Orientation",v:client.deepDive.spiritualOrientation},
                {h:"Relationship with the Earth",v:client.deepDive.earthRelation},
                {h:"Lineages & Practices",v:client.deepDive.lineages},
                {h:"Sacred Medicine History",v:client.deepDive.entheoHistory},
                {h:"Difficult Experiences",v:client.deepDive.entheoHard},
                {h:"Archetypes & Roles",v:client.deepDive.archetypes},
                {h:"This Season",v:client.deepDive.lifeChapter},
                {h:"What Is Shifting",v:client.deepDive.shifting},
                {h:"Intention for This Work",v:client.deepDive.intention},
                {h:"Hopes",v:client.deepDive.hopes},
                {h:"What May Fall Away",v:client.deepDive.releasing},
                {h:"Closing Thoughts",v:client.deepDive.closingThoughts},
              ].filter(x=>x.v).map(x=>(
                <div key={x.h}>
                  <SectionHead accent={C.sage}>{x.h}</SectionHead>
                  <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,lineHeight:1.7}}>{x.v}</div>
                </div>
              ))}
            </>}
          </div>
        )}

        {!addingSession && tab==="session log" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:"italic",color:C.brown}}>
                {client.sessions.length} session{client.sessions.length!==1?"s":""} on record
              </div>
              <Btn small color={C.sage} onClick={()=>setAddingSession(true)}>+ Add Session</Btn>
            </div>
            {client.sessions.length===0 && (
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,fontStyle:"italic"}}>No sessions logged yet.</div>
            )}
            {[...client.sessions].reverse().map(sess=>(
              <div key={sess.id} style={{background:C.parchMd,borderRadius:8,border:`1px solid ${C.sandLt}`,padding:16,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontFamily:"'Courier Prime',monospace",fontSize:12,color:C.brownMd}}>{sess.date}</div>
                  <div style={{display:"flex",gap:6}}>
                    {sess.modality && <Pill label={sess.modality} color={C.sage} />}
                    {sess.amount && <Pill label={`$${sess.amount}`} color={C.moss} />}
                  </div>
                </div>
                {sess.intention && <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,fontStyle:"italic",
                  color:C.brown,marginBottom:8,lineHeight:1.6}}>"{sess.intention}"</div>}
                {[
                  ["SESSION NOTES",sess.sessionNotes,C.brown],
                  ["AFTERCARE",sess.aftercare,C.brown],
                  ["INTEGRATION THREADS",sess.integrationNotes,C.rose],
                  ["FOLLOW-UP",sess.followUp,C.sage],
                ].filter(([,v])=>v).map(([label,val,color])=>(
                  <div key={label} style={{marginBottom:8}}>
                    <div style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.brownMd,marginBottom:3,letterSpacing:"0.05em"}}>{label}</div>
                    <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color,lineHeight:1.6}}>{val}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {!addingSession && tab==="resources" && (
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:"italic",color:C.brown,marginBottom:6}}>
              Resources — toggle to mark as sent
            </div>
            <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,lineHeight:1.6,marginBottom:20}}>
              Track which guides, protocols, and orientation materials have been shared with this client.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
              {RESOURCES.map(r=>{
                const sent = (client.resources||{})[r.id];
                return (
                  <div key={r.id} style={{
                    background:sent?`${C.sage}12`:C.white,
                    borderRadius:8, border:`1px solid ${sent?C.sage:C.sandLt}`,
                    padding:14, display:"flex", alignItems:"center", gap:12,
                    transition:"all 0.2s",
                  }}>
                    <div style={{fontSize:22,flexShrink:0}}>{r.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,fontWeight:500}}>{r.label}</div>
                      <div style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.brownMd,marginTop:2}}>{r.desc}</div>
                      {sent && (
                        <div style={{fontFamily:"'Courier Prime',monospace",fontSize:9,color:C.sage,marginTop:4}}>
                          ✓ Sent {new Date(sent).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button onClick={()=>toggleResource(r.id)} style={{
                      width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
                      background:sent?C.sage:C.sandLt,
                      position:"relative", flexShrink:0, transition:"background 0.2s",
                    }}>
                      <div style={{
                        position:"absolute", top:2, left:sent?18:2, width:16, height:16,
                        borderRadius:"50%", background:C.white, transition:"left 0.2s",
                      }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!addingSession && tab==="notes" && (
          <div>
            <SectionHead accent={C.brown}>Ongoing Practitioner Notes</SectionHead>
            <div style={{fontFamily:"'EB Garamond',serif",fontSize:12,color:C.brownMd,marginBottom:8,fontStyle:"italic"}}>
              Private — not shared with client. Patterns, observations, arc intentions.
            </div>
            <textarea rows={14} value={editNote} onChange={e=>setEditNote(e.target.value)}
              style={{...inputStyle,width:"100%"}}
              placeholder="Ongoing observations, somatic patterns, integration threads, care considerations…" />
            <div style={{marginTop:10}}>
              <Btn color={C.terra} onClick={()=>onUpdate({...client,practitionerNotes:editNote})}>Save Notes</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ClientsView({clients, onClientsChange, deepLinkId, onDeepLinkClear}) {
  const [view, setView] = useState(deepLinkId?"dossier":"list");
  const [selected, setSelected] = useState(deepLinkId?clients.find(c=>c.id===deepLinkId)||null:null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(()=>{
    if (deepLinkId) {
      const c = clients.find(c=>c.id===deepLinkId);
      if (c) {setSelected(c);setView("dossier");}
      onDeepLinkClear?.();
    }
  },[deepLinkId]);

  function addClient(client) { const updated=[...clients,client]; onClientsChange(updated); setSelected(client); setView("dossier"); }
  function updateClient(updated) { onClientsChange(clients.map(c=>c.id===updated.id?updated:c)); setSelected(updated); }

  const filtered = clients.filter(c=>{
    const name=`${c.firstName} ${c.lastName}`.toLowerCase();
    return (name.includes(search.toLowerCase())||c.email.toLowerCase().includes(search.toLowerCase()))
      && (filterType==="all"||c.type===filterType);
  });

  if (view==="new") return (
    <div style={{padding:24,background:C.parch}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontStyle:"italic",color:C.brown,marginBottom:20}}>New Client Intake</div>
      <IntakeForm onSave={addClient} onCancel={()=>setView("list")} />
    </div>
  );
  if (view==="dossier"&&selected) return (
    <ClientDossier client={clients.find(c=>c.id===selected.id)||selected} onUpdate={updateClient} onBack={()=>setView("list")} />
  );

  return (
    <div>
      <div style={{padding:"14px 0",display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:20}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
            style={{...inputStyle,width:220,height:34,padding:"6px 12px"}} />
          {["all","single","arc"].map(f=>(
            <button key={f} onClick={()=>setFilterType(f)} style={{
              background:filterType===f?C.terra:"transparent",
              color:filterType===f?C.white:C.brownMd,
              border:`1px solid ${filterType===f?C.terra:C.sand}`,
              borderRadius:20,padding:"4px 14px",cursor:"pointer",
              fontFamily:"'Courier Prime',monospace",fontSize:11,letterSpacing:"0.04em",
            }}>{f==="all"?"All":f==="single"?"Single Session":"Arc Clients"}</button>
          ))}
        </div>
        <Btn color={C.terra} onClick={()=>setView("new")}>+ New Client</Btn>
      </div>

      {filtered.length===0 && (
        <div style={{textAlign:"center",padding:60,fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:C.brownMd,fontSize:16}}>
          {clients.length===0?"The book is open. Add your first client to begin.":"No clients match your search."}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {filtered.map(c=>{
          const flags=[...c.medFlags,...c.mhFlags].filter(f=>f!=="None of the above");
          const revenue=c.sessions.reduce((s,sess)=>s+(parseFloat(sess.amount)||0),0);
          return (
            <div key={c.id} onClick={()=>{setSelected(c);setView("dossier");}} style={{
              background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,
              padding:18,cursor:"pointer",transition:"box-shadow 0.2s",
            }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 16px ${C.sand}66`}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:"italic",color:C.brown}}>
                  {c.firstName} {c.lastName}
                </div>
                {flags.length>0 && <div style={{width:8,height:8,borderRadius:"50%",background:C.terra,flexShrink:0,marginTop:5}} />}
              </div>
              <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.brownMd,marginTop:4}}>{c.email||"—"}</div>
              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                <Pill label={c.type==="arc"?"Arc":"Single"} color={c.type==="arc"?C.ochre:C.sage} />
                {c.deepDive && <Pill label="Deep Dive" color={C.rose} />}
                <Pill label={`${c.sessions.length} session${c.sessions.length!==1?"s":""}`} color={C.sand} />
                {revenue>0 && <Pill label={`$${revenue}`} color={C.moss} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_LABELS = ["Formation","Orientation","Active Work","Deepening","Harvest","Completion"];
function GroupsView({groups, setGroups}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({name:"",type:"council",members:"",nextMeet:"",status:"forming",notes:"",phase:0});
  const typeColors = {council:C.rose,community:C.sage,lab:C.ochre,circle:C.terra};

  function saveGroup() {
    const g={...form,id:uid(),members:parseInt(form.members)||0,phase:parseInt(form.phase)||0};
    const updated=[...groups,g];
    setGroups(updated); saveGroups(updated); setAdding(false);
    setForm({name:"",type:"council",members:"",nextMeet:"",status:"forming",notes:"",phase:0});
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:C.brown}}>
          Councils, Circles & Communities
        </div>
        <Btn color={C.rose} onClick={()=>setAdding(true)}>+ New Group</Btn>
      </div>

      {adding && (
        <div style={{background:C.parchMd,borderRadius:10,border:`1px solid ${C.sand}`,padding:20,marginBottom:20}}>
          <SectionHead accent={C.rose}>New Group</SectionHead>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="GROUP NAME" value={form.name}      onChange={v=>setForm(p=>({...p,name:v}))} />
            <SelectField label="TYPE" value={form.type}      onChange={v=>setForm(p=>({...p,type:v}))} options={["council","community","lab","circle","arc","sit"]} />
            <Field label="MEMBERS"    value={form.members}   onChange={v=>setForm(p=>({...p,members:v}))} type="number" />
            <Field label="NEXT MEETING" value={form.nextMeet} onChange={v=>setForm(p=>({...p,nextMeet:v}))} type="date" />
            <SelectField label="STATUS"  value={form.status} onChange={v=>setForm(p=>({...p,status:v}))} options={["forming","active","paused","complete"]} />
            <SelectField label="PHASE"   value={form.phase}  onChange={v=>setForm(p=>({...p,phase:v}))} options={PHASE_LABELS.map((_,i)=>i.toString())} />
          </div>
          <Field label="NOTES" value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} rows={2} />
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn outline color={C.brownMd} onClick={()=>setAdding(false)}>Cancel</Btn>
            <Btn color={C.rose} onClick={saveGroup}>Save Group</Btn>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {groups.map(g=>(
          <div key={g.id} style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:"italic",color:C.brown}}>{g.name}</div>
              <Pill label={g.status} color={g.status==="active"?C.sage:C.brownLt} />
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              <Pill label={g.type} color={typeColors[g.type]||C.terra} />
              <Pill label={`${g.members} members`} color={C.sand} />
            </div>
            {g.nextMeet && <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.brownMd,marginBottom:6}}>Next: {g.nextMeet}</div>}
            {g.notes && <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,fontStyle:"italic",lineHeight:1.5}}>{g.notes}</div>}
            {g.phase!==undefined && (
              <PhaseTrack phase={parseInt(g.phase)||0} phases={PHASE_LABELS} color={typeColors[g.type]||C.terra} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CircuitView() {
  const statusColors = {active:C.sage,confirmed:C.ochre,tentative:C.brownLt,planning:C.rose};
  return (
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:C.brown,marginBottom:6}}>The Migratory Circuit</div>
      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,lineHeight:1.6,marginBottom:24}}>
        The living route across communities, regions, and sacred sites.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {CIRCUIT.map((stop,i)=>(
          <div key={stop.id} style={{display:"flex",gap:0,alignItems:"stretch"}}>
            <div style={{width:40,display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:statusColors[stop.status]||C.sand,
                border:`2px solid ${C.parch}`,marginTop:20,flexShrink:0,zIndex:1}} />
              {i<CIRCUIT.length-1 && <div style={{width:2,flex:1,background:`${C.sand}88`,minHeight:20}} />}
            </div>
            <div style={{flex:1,background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:"14px 18px",margin:"0 0 12px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:C.brown}}>{stop.location}</div>
                <Pill label={stop.status} color={statusColors[stop.status]||C.sand} />
              </div>
              <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center"}}>
                <Pill label={stop.type} color={C.brownLt} />
                <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.brownMd}}>{stop.dates}</div>
              </div>
              {stop.notes && <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,marginTop:8,fontStyle:"italic"}}>{stop.notes}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ECOSYSTEM VIEW
// ─────────────────────────────────────────────────────────────────────────────
function EcosystemView() {
  const tiers = [
    {
      name:"Tier I — Individual",
      color:C.sage, bgColor:`${C.sage}10`,
      items:[
        {icon:"◐", label:"Single Session",     sub:"Triage & supportive care. Entry point into the practice.", auto:"6-step follow-up sequence"},
        {icon:"◎", label:"Long-Term 1:1 Arc",  sub:"6-phase developmental journey. Deep work over time.",    auto:"Full lifecycle automation"},
      ],
    },
    {
      name:"Tier II — Group",
      color:C.terra, bgColor:`${C.terra}08`,
      items:[
        {icon:"◇", label:"Community Sit",          sub:"Open-door communal care & belonging.",                   auto:"5-step community flow"},
        {icon:"◈", label:"Ongoing Small Group",    sub:"Focused cohort. 6-phase container.",                    auto:"Full group lifecycle"},
        {icon:"◉", label:"Developmental Group Arc",sub:"Long-form collective transformation.",                   auto:"Arc + individual check-ins"},
      ],
    },
    {
      name:"Tier III — Migratory Circuit",
      color:C.ochre, bgColor:`${C.ochre}08`,
      items:[
        {icon:"⬡", label:"Workshops at Events", sub:"High-reach seeding. Regional roots.",      auto:"7-step host & attendee flow"},
        {icon:"◌", label:"Return Circuit",       sub:"Annual routes. Living network.",            auto:"3-month pre-visit activation"},
      ],
    },
  ];

  const flows = [
    [["Single Session",C.ochre],["→"],["Community Sit",C.roseLt],["→"],["Small Group",C.terra],["→"],["Group Arc",C.sage]],
    [["Single Session",C.ochre],["→"],["Long-Term Arc",C.sage],["→"],["Alumni Circle",C.moss],["→"],["Group Arc",C.terra]],
    [["Workshop Visit",C.terra],["→"],["Community Sit",C.roseLt],["→"],["Single Session",C.ochre],["→"],["Long-Term Arc",C.sage]],
  ];

  return (
    <div className="fade-up">
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontStyle:"italic",color:C.brown,marginBottom:6}}>
        The Living Ecosystem
      </div>
      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,marginBottom:28,lineHeight:1.6}}>
        Three tiers, one coherent ceremonial practice — each pathway seeding the next.
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:36}}>
        {tiers.map((tier,ti)=>(
          <div key={ti} style={{border:`1px solid ${C.sandLt}`,borderLeft:`4px solid ${tier.color}`,borderRadius:8,overflow:"hidden"}}>
            <div style={{background:tier.bgColor,padding:"10px 20px",borderBottom:`1px solid ${C.sandLt}`,
              display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:tier.color,fontStyle:"italic"}}>{tier.name}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${tier.items.length},1fr)`}}>
              {tier.items.map((item,ii)=>(
                <div key={ii} style={{
                  padding:"16px 20px",background:C.white,
                  borderRight:ii<tier.items.length-1?`1px solid ${C.sandLt}`:"none",
                  transition:"all 0.2s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background=`${tier.color}08`}
                onMouseLeave={e=>e.currentTarget.style.background=C.white}
                >
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                    <span style={{color:tier.color,fontSize:14}}>{item.icon}</span>
                    <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:C.brown}}>{item.label}</span>
                  </div>
                  <p style={{fontSize:13,color:C.brownMd,marginBottom:10,lineHeight:1.6,fontFamily:"'EB Garamond',serif",fontStyle:"italic"}}>{item.sub}</p>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{color:C.ochre,fontSize:10}}>⚡</span>
                    <span style={{fontSize:10,color:C.brownLt,fontFamily:"'Courier Prime',monospace"}}>{item.auto}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:"italic",color:C.brown,marginBottom:16}}>
        Conversion Flows
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:36}}>
        {flows.map((flow,fi)=>(
          <div key={fi} style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,
            background:C.white,borderRadius:8,border:`1px solid ${C.sandLt}`,padding:"12px 18px"}}>
            {flow.map((step,si)=>
              step[0]==="→"
                ? <span key={si} style={{color:C.sand,fontSize:14,fontFamily:"'Courier Prime',monospace"}}>→</span>
                : <span key={si} style={{
                    padding:"3px 12px",borderRadius:20,
                    background:`${step[1]}18`,border:`1px solid ${step[1]}55`,
                    color:step[1],fontFamily:"'EB Garamond',serif",fontSize:13,
                  }}>{step[0]}</span>
            )}
          </div>
        ))}
      </div>

      <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:"italic",color:C.brown,marginBottom:16}}>
        Tool Infrastructure
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[
          {tool:"Acuity Scheduling",  use:"Booking, reminders, timezone handling, intake form triggers",     color:C.sage},
          {tool:"Square / Stripe",    use:"Payments, subscriptions, sliding-scale, international invoicing",  color:C.moss},
          {tool:"ConvertKit",         use:"Email sequences, tagging, flow automation, broadcasts",            color:C.ochre},
          {tool:"Squarespace",        use:"Public website, SEO, service pages, community landing",           color:C.terra},
          {tool:"Google Calendar",    use:"Session scheduling, integration with Acuity, personal rhythm",    color:C.roseLt},
          {tool:"WhatsApp / Signal",  use:"Client messaging, pod communications, community pods",            color:C.brownLt},
        ].map((t,i)=>(
          <div key={i} style={{padding:"12px 14px",background:C.white,borderRadius:8,
            border:`1px solid ${C.sandLt}`,borderLeft:`3px solid ${t.color}`}}>
            <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:t.color,marginBottom:5}}>{t.tool}</div>
            <div style={{fontSize:12,color:C.brownMd,lineHeight:1.55,fontFamily:"'EB Garamond',serif",fontStyle:"italic"}}>{t.use}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INCOME VIEW
// ─────────────────────────────────────────────────────────────────────────────
function IncomeView({clients}) {
  const allSessions = clients.flatMap(c=>
    c.sessions.filter(s=>s.amount&&parseFloat(s.amount)>0).map(s=>({...s, clientName:`${c.firstName} ${c.lastName}`, clientId:c.id}))
  );
  const totalRevenue = allSessions.reduce((sum,s)=>sum+(parseFloat(s.amount)||0),0);
  const totalSessions = clients.reduce((sum,c)=>sum+c.sessions.length,0);
  const avgPerClient = clients.length ? totalRevenue/clients.length : 0;

  const byModality = {};
  allSessions.forEach(s=>{
    if(s.modality) byModality[s.modality]=(byModality[s.modality]||0)+(parseFloat(s.amount)||0);
  });
  const maxModality = Math.max(...Object.values(byModality),1);

  const clientRevenue = clients.map(c=>({
    name:`${c.firstName} ${c.lastName}`,
    id:c.id,
    revenue:c.sessions.reduce((s,sess)=>s+(parseFloat(sess.amount)||0),0),
    sessions:c.sessions.length,
  })).filter(c=>c.revenue>0).sort((a,b)=>b.revenue-a.revenue);

  const maxClient = clientRevenue[0]?.revenue||1;

  return (
    <div className="fade-up">
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontStyle:"italic",color:C.brown,marginBottom:6}}>
        Income & Sacred Reciprocity
      </div>
      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,marginBottom:28,lineHeight:1.6}}>
        The energetic exchange — what the practice has received and returned.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
        <StatCard value={`$${Math.round(totalRevenue).toLocaleString()}`} label="TOTAL RECEIVED"   color={C.moss} />
        <StatCard value={totalSessions}                                    label="TOTAL SESSIONS"   color={C.sage} />
        <StatCard value={`$${Math.round(avgPerClient).toLocaleString()}`} label="AVG PER CLIENT"   color={C.ochre} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
        <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:C.brown,marginBottom:16}}>
            Revenue by Modality
          </div>
          {Object.keys(byModality).length===0
            ? <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,fontStyle:"italic"}}>
                Add session amounts to see breakdown.
              </div>
            : Object.entries(byModality).sort((a,b)=>b[1]-a[1]).map(([mod,amt])=>(
              <div key={mod} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brown}}>{mod}</div>
                  <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.moss}}>${Math.round(amt).toLocaleString()}</div>
                </div>
                <div style={{height:4,background:C.sandLt,borderRadius:2}}>
                  <div style={{height:4,background:C.sage,borderRadius:2,width:`${(amt/maxModality)*100}%`,transition:"width 0.3s"}} />
                </div>
              </div>
            ))
          }
        </div>

        <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:C.brown,marginBottom:16}}>
            Top Clients by Revenue
          </div>
          {clientRevenue.length===0
            ? <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brownMd,fontStyle:"italic"}}>
                No revenue logged yet.
              </div>
            : clientRevenue.slice(0,6).map((c,i)=>(
              <div key={c.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brown,fontWeight:i===0?"500":"400"}}>{c.name}</div>
                  <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:C.moss}}>${Math.round(c.revenue).toLocaleString()}</div>
                </div>
                <div style={{height:4,background:C.sandLt,borderRadius:2}}>
                  <div style={{height:4,background:C.ochre,borderRadius:2,width:`${(c.revenue/maxClient)*100}%`,transition:"width 0.3s"}} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,padding:20}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontStyle:"italic",color:C.brown,marginBottom:16}}>
          Suggested Rate Card
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {Object.entries(PRICES).filter(([,v])=>v>0).map(([mod,price])=>(
            <div key={mod} style={{background:C.parchMd,borderRadius:6,padding:"10px 14px",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:C.brown}}>{mod}</div>
              <div style={{fontFamily:"'Courier Prime',monospace",fontSize:12,color:C.moss}}>${price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION VIEW
// ─────────────────────────────────────────────────────────────────────────────
function AutomationView() {
  const [selected, setSelected] = useState("single");

  const flowDefs = [
    {key:"single", label:"Single Session",    color:C.ochre, icon:"◐"},
    {key:"arc",    label:"Long-Term Arc",      color:C.sage,  icon:"◎"},
    {key:"sit",    label:"Community Sit",      color:C.rose,  icon:"◇"},
    {key:"group",  label:"Small Group Arc",    color:C.terra, icon:"◈"},
    {key:"travel", label:"Workshop & Travel",  color:C.moss,  icon:"⬡"},
  ];

  const steps = AUTO_FLOWS[selected]||[];
  const def = flowDefs.find(f=>f.key===selected)||flowDefs[0];

  return (
    <div className="fade-up">
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontStyle:"italic",color:C.brown,marginBottom:6}}>
        Automation Architecture
      </div>
      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,lineHeight:1.6,marginBottom:28}}>
        Every trigger, sequence, and touchpoint across all tiers.
      </div>

      <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
        {flowDefs.map(f=>(
          <button key={f.key} onClick={()=>setSelected(f.key)} style={{
            padding:"8px 18px", borderRadius:20, cursor:"pointer", transition:"all 0.2s",
            background:selected===f.key?`${f.color}18`:"transparent",
            border:`1px solid ${selected===f.key?f.color:C.sand}`,
            color:selected===f.key?f.color:C.brownMd,
            fontFamily:"'Courier Prime',monospace",fontSize:11,letterSpacing:"0.04em",
            display:"flex",alignItems:"center",gap:6,
          }}>
            <span>{f.icon}</span> {f.label}
          </button>
        ))}
      </div>

      <div style={{position:"relative",marginBottom:36}}>
        <div style={{position:"absolute",left:20,top:12,bottom:12,width:2,
          background:`linear-gradient(to bottom,${def.color}60,${def.color}10)`}} />
        {steps.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:20,marginBottom:10}}>
            <div style={{
              width:42,height:42,borderRadius:"50%",flexShrink:0,
              background:`${def.color}18`,border:`2px solid ${def.color}40`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Courier Prime',monospace",fontSize:12,color:def.color,zIndex:1,
            }}>{i+1}</div>
            <div style={{
              flex:1,background:C.white,border:`1px solid ${C.sandLt}`,
              borderRadius:8,padding:"14px 20px",
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,
            }}>
              <div>
                <div style={{fontFamily:"'EB Garamond',serif",fontSize:15,color:C.brown,marginBottom:5}}>{s.action}</div>
                <div style={{fontSize:11,color:C.brownMd,fontStyle:"italic",fontFamily:"'EB Garamond',serif"}}>Trigger: {s.step}</div>
              </div>
              <div style={{
                background:`${def.color}18`,border:`1px solid ${def.color}40`,
                borderRadius:4,padding:"4px 12px",flexShrink:0,
                fontFamily:"'Courier Prime',monospace",fontSize:10,color:def.color,
              }}>{s.delay}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.sandLt}`,borderTop:`3px solid ${C.terra}`,padding:24}}>
        <div style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.terra,letterSpacing:"0.1em",marginBottom:16}}>
          RECOMMENDED AUTOMATION STACK
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[
            {tool:"Acuity / Calendly",   use:"Booking, reminders, timezone handling, intake triggers",          color:C.sage},
            {tool:"ConvertKit",          use:"Email sequences, tagging, flow automation, broadcasts",           color:C.moss},
            {tool:"Squarespace",         use:"Web presence, service pages, SEO, community landing",            color:C.ochre},
            {tool:"Square / Stripe",     use:"Payments, sliding scale, subscriptions, international invoicing", color:C.terra},
            {tool:"Google Calendar",     use:"Scheduling, arc tracking, group meetings, circuit planning",      color:C.roseLt},
            {tool:"Zapier / Make",       use:"Glue layer — booking → email → CRM → payment → portal",         color:C.brownLt},
          ].map((t,i)=>(
            <div key={i} style={{padding:"12px 14px",background:C.parchMd,borderRadius:6,
              border:`1px solid ${C.sandLt}`,borderLeft:`3px solid ${t.color}`}}>
              <div style={{fontFamily:"'Courier Prime',monospace",fontSize:11,color:t.color,marginBottom:5}}>{t.tool}</div>
              <div style={{fontSize:12,color:C.brownMd,lineHeight:1.55,fontFamily:"'EB Garamond',serif",fontStyle:"italic"}}>{t.use}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE / CLIENT FLOW VIEW
// ─────────────────────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  {id:"inquiry",      label:"Inquiry",          icon:"◌", color:C.brownLt,  desc:"Initial contact, pre-intake"},
  {id:"intake",       label:"Intake",           icon:"📋", color:C.ochre,   desc:"Intake received, preparing for first session"},
  {id:"first",        label:"First Session",    icon:"🌱", color:C.sage,    desc:"First session scheduled or completed"},
  {id:"active",       label:"Active",           icon:"◯", color:C.terra,   desc:"Regular 1:1 sessions ongoing"},
  {id:"arc",          label:"Mentorship Arc",   icon:"🔮", color:C.rose,    desc:"In a long-arc mentorship container"},
  {id:"integration",  label:"Integration",      icon:"🌙", color:C.brownMd, desc:"Between sessions, integrating"},
  {id:"alumni",       label:"Alumni",           icon:"✦", color:C.moss,    desc:"Completed work, community holder"},
];

function PipelineView({clients, onNav, onClientsChange}) {
  const [dragging, setDragging] = useState(null);
  const [hovering, setHovering] = useState(null);

  // Each client has a `pipelineStage` field; default based on existing data
  function getStage(c) {
    if (c.pipelineStage) return c.pipelineStage;
    if (c.type === "arc") return "arc";
    if (c.sessions && c.sessions.length > 2) return "active";
    if (c.sessions && c.sessions.length === 1) return "first";
    if (c.email || c.phone) return "intake";
    return "inquiry";
  }

  function setStage(clientId, stageId) {
    const updated = clients.map(c => c.id === clientId ? {...c, pipelineStage: stageId} : c);
    onClientsChange(updated);
  }

  const byStage = {};
  PIPELINE_STAGES.forEach(s => { byStage[s.id] = []; });
  clients.forEach(c => {
    const stage = getStage(c);
    if (byStage[stage]) byStage[stage].push(c);
    else byStage["inquiry"].push(c);
  });

  function onDragStart(clientId) { setDragging(clientId); }
  function onDragOver(e, stageId) { e.preventDefault(); setHovering(stageId); }
  function onDrop(e, stageId) { e.preventDefault(); if (dragging) setStage(dragging, stageId); setDragging(null); setHovering(null); }
  function onDragEnd() { setDragging(null); setHovering(null); }

  const colWidth = 210;

  return (
    <div className="fade-up">
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontStyle:"italic",color:C.brown,marginBottom:6}}>
        Client Flow Pipeline
      </div>
      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brownMd,marginBottom:20,lineHeight:1.6}}>
        Drag clients between stages to track their journey through your practice.
      </div>

      <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:20,alignItems:"flex-start"}}>
        {PIPELINE_STAGES.map(stage => {
          const stageClients = byStage[stage.id] || [];
          const isHovering = hovering === stage.id;
          return (
            <div key={stage.id}
              style={{
                minWidth:colWidth, width:colWidth, flexShrink:0,
                background:isHovering ? stage.color + "18" : C.parchMd,
                borderRadius:10, border:`2px solid ${isHovering ? stage.color : C.sandLt}`,
                transition:"all 0.15s",
              }}
              onDragOver={e => onDragOver(e, stage.id)}
              onDrop={e => onDrop(e, stage.id)}
            >
              {/* Column header */}
              <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${stage.color}33`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:14}}>{stage.icon}</span>
                    <span style={{fontFamily:"'Courier Prime',monospace",fontSize:11,fontWeight:700,
                      color:stage.color,letterSpacing:"0.05em"}}>{stage.label.toUpperCase()}</span>
                  </div>
                  <span style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:C.brownMd,
                    background:C.white,borderRadius:12,padding:"1px 7px",border:`1px solid ${C.sandLt}`}}>
                    {stageClients.length}
                  </span>
                </div>
                <div style={{fontFamily:"'EB Garamond',serif",fontSize:12,color:C.brownMd,
                  fontStyle:"italic",marginTop:4,lineHeight:1.4}}>{stage.desc}</div>
              </div>

              {/* Cards */}
              <div style={{padding:"8px 8px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:100}}>
                {stageClients.map(c => {
                  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "(unnamed)";
                  const lastSession = c.sessions?.length
                    ? c.sessions.sort((a,b) => b.date.localeCompare(a.date))[0]
                    : null;
                  return (
                    <div key={c.id}
                      draggable
                      onDragStart={() => onDragStart(c.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => onNav(c.id)}
                      style={{
                        background:C.white, borderRadius:7,
                        border:`1px solid ${C.sandLt}`,
                        borderLeft:`3px solid ${stage.color}`,
                        padding:"10px 12px", cursor:"grab",
                        boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                        transition:"box-shadow 0.15s",
                        opacity: dragging === c.id ? 0.5 : 1,
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,0.10)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}
                    >
                      <div style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:C.brown,fontWeight:"500",marginBottom:4}}>
                        {name}
                      </div>
                      {c.type && <Pill label={c.type} color={stage.color} />}
                      {lastSession && (
                        <div style={{fontFamily:"'Courier Prime',monospace",fontSize:9,
                          color:C.brownMd,marginTop:6,letterSpacing:"0.04em"}}>
                          Last: {lastSession.date}
                        </div>
                      )}
                      {c.sessions?.length > 0 && (
                        <div style={{fontFamily:"'Courier Prime',monospace",fontSize:9,
                          color:C.brownMd,letterSpacing:"0.04em"}}>
                          {c.sessions.length} session{c.sessions.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageClients.length === 0 && (
                  <div style={{fontFamily:"'EB Garamond',serif",fontSize:12,color:C.brownMd,
                    fontStyle:"italic",textAlign:"center",padding:"20px 0",opacity:0.6}}>
                    Drop clients here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage summary strip */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
        {PIPELINE_STAGES.map(s => byStage[s.id]?.length > 0 && (
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:5,
            background:s.color+"15",border:`1px solid ${s.color}44`,borderRadius:20,
            padding:"4px 12px"}}>
            <span style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:s.color}}>{s.label}</span>
            <span style={{fontFamily:"'Courier Prime',monospace",fontSize:10,color:s.color,fontWeight:700}}>
              {byStage[s.id].length}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WORKHUB
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  {id:"overview",   icon:"✦", label:"Overview"},
  {id:"clients",    icon:"◯", label:"Clients"},
  {id:"pipeline",   icon:"⟶", label:"Pipeline"},
  {id:"groups",     icon:"⬡", label:"Groups"},
  {id:"circuit",    icon:"⟳", label:"Circuit"},
  {id:"ecosystem",  icon:"◉", label:"Ecosystem"},
  {id:"income",     icon:"$", label:"Income"},
  {id:"automation", icon:"⚡", label:"Automation"},
];

function WorkHub() {
  const startView = (function() {
    try { const v = sessionStorage.getItem('crm:startView'); if (v) { sessionStorage.removeItem('crm:startView'); return v; } } catch {}
    return "overview";
  })();
  const [view, setView] = useState(startView);
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState(SAMPLE_GROUPS);
  const [loaded, setLoaded] = useState(false);
  const [clientDeepLink, setClientDeepLink] = useState(null);

  useEffect(()=>{
    Promise.all([loadClients(),loadGroups()]).then(([c,g])=>{
      setClients(c); setGroups(g); setLoaded(true);
    });
  },[]);

  async function handleClientsChange(updated) {
    setClients(updated);
    await saveClients(updated);
  }

  function navToClient(clientId) {
    setClientDeepLink(clientId);
    setView("clients");
  }

  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      background:C.parch,fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:C.brownMd,fontSize:18}}>
      <style>{FONTS}</style>
      The Haven is opening…
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.parch,fontFamily:"'EB Garamond',serif"}}>
      <style>{FONTS}</style>

      <div style={{background:C.umber,padding:"0 28px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:16,paddingBottom:12}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontStyle:"italic",color:C.white,letterSpacing:"0.02em"}}>
              The Animist Apothecary
            </div>
            <div style={{fontFamily:"'Courier Prime',monospace",fontSize:9,color:C.sand,opacity:0.6,letterSpacing:"0.12em",marginTop:2}}>
              WORKHUB · THE HAVEN · TOPANGA CANYON
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div className="pulse" style={{width:7,height:7,borderRadius:"50%",background:C.sageLt,boxShadow:`0 0 6px ${C.sageLt}`}} />
              <span style={{fontFamily:"'Courier Prime',monospace",fontSize:9,color:C.sand,opacity:0.6}}>
                {clients.length} clients · {groups.length} groups · {CIRCUIT.length} stops
              </span>
            </div>
            <a href="../admin/index.html" style={{fontFamily:"'Courier Prime',monospace",fontSize:10,
              color:C.sand,opacity:0.5,textDecoration:"none",letterSpacing:"0.06em"}}>← Admin</a>
          </div>
        </div>

        <div style={{display:"flex",gap:0,overflowX:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{
              background:view===n.id?"rgba(255,248,242,0.08)":"transparent",
              border:"none",borderBottom:view===n.id?`2px solid ${C.terra}`:"2px solid transparent",
              color:view===n.id?C.white:C.sand,
              opacity:view===n.id?1:0.6,
              padding:"10px 18px",cursor:"pointer",
              fontFamily:"'Courier Prime',monospace",fontSize:11,letterSpacing:"0.06em",
              transition:"all 0.15s",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",
            }}>
              <span style={{opacity:0.8}}>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{height:3,background:`linear-gradient(90deg,${C.terra},${C.ochre},${C.sageLt},${C.roseLt},${C.terra})`,opacity:0.6}} />

      <div style={{maxWidth:1220,margin:"0 auto",padding:"32px 28px 60px"}}>
        {view==="overview"   && <OverviewView clients={clients} groups={groups} onNav={navToClient} />}
        {view==="clients"    && (
          <ClientsView
            clients={clients}
            onClientsChange={handleClientsChange}
            deepLinkId={clientDeepLink}
            onDeepLinkClear={()=>setClientDeepLink(null)}
          />
        )}
        {view==="pipeline"   && (
          <PipelineView
            clients={clients}
            onNav={navToClient}
            onClientsChange={handleClientsChange}
          />
        )}
        {view==="groups"     && <GroupsView groups={groups} setGroups={setGroups} />}
        {view==="circuit"    && <CircuitView />}
        {view==="ecosystem"  && <EcosystemView />}
        {view==="income"     && <IncomeView clients={clients} />}
        {view==="automation" && <AutomationView />}
      </div>
    </div>
  );
}
