import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Calculator, CheckCircle2, ChevronRight, FlaskConical, History, LogOut, ShieldCheck, UserPlus, X } from 'lucide-react';

const emptyLane = { student_name: '', sample_name: '', weight: '', aliquot: '50', standard_factor: '0.0025', fehling_volume: '', sample_volume: '', spiked_sugar_percent: '', sample_sugar_percent: '', sugar_added_percent: '' };
const emptyAsh = { student_name: '', sample_name: '', crucible_weight: '', sample_weight: '', ash_weight: '' };

export default function SugarLab() {
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        fetch('/auth/csrf', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((response) => response.json())
            .then((data) => {
                document.querySelector('meta[name="csrf-token"]').content = data.csrf_token;
                return fetch('/auth/user', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            })
            .then((response) => response.json())
            .then((data) => setUser(data.user ?? null));
    }, []);

    if (user === undefined) return <div className="auth-loading">Loading Sugar Lab...</div>;
    if (!user) return <AuthScreen onAuthenticated={setUser} />;

    return <LabApp user={user} onUserChange={setUser} onLogout={() => setUser(null)} />;
}

function AuthScreen({ onAuthenticated }) {
    const teacherLogin = window.location.pathname === '/teacher-login';
    const [mode, setMode] = useState(window.location.pathname === '/register' ? 'register' : 'login');
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', remember: false });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const isRegister = mode === 'register';

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        const csrfResponse = await fetch('/auth/csrf', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrf_token;
        document.querySelector('meta[name="csrf-token"]').content = csrfToken;
        const response = await fetch(`/auth/${mode}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({ ...form, teacher: teacherLogin }),
        });
        const data = await response.json();
        setSubmitting(false);
        if (!response.ok) {
            setError(Object.values(data.errors ?? {}).flat().join(' ') || data.message || 'Unable to continue. Please try again.');
            return;
        }
        if (data.csrf_token) document.querySelector('meta[name="csrf-token"]').content = data.csrf_token;
        onAuthenticated(data.user);
    };

    const changeMode = (nextMode) => { setMode(nextMode); setError(''); window.history.replaceState({}, '', nextMode === 'register' ? '/register' : '/login'); };

    return <main className="auth-page">
        <section className="auth-panel">
            <div className="auth-brand"><span className="brand-mark">SL</span><span><strong>Sugar Lab / 8211</strong><small>Sugarcane Processing and Sugar Technology</small></span></div>
            <div className="eyebrow">Mbeya University · Food Sciences</div>
            <h1>{isRegister ? 'Create your lab account.' : 'Welcome back to the lab.'}</h1>
            <p className="auth-intro">{isRegister ? 'Set up your student profile to save practical sessions and results.' : 'Sign in to continue your practical work and review saved results.'}</p>
            <div className="auth-tabs"><button className={!isRegister ? 'active' : ''} onClick={() => changeMode('login')}>{teacherLogin ? 'Teacher sign in' : 'Sign in'}</button>{!teacherLogin && <button className={isRegister ? 'active' : ''} onClick={() => changeMode('register')}><UserPlus size={14} /> Register</button>}</div>
            {error && <div className="auth-error">{error}</div>}
            <form className="auth-form" onSubmit={submit}>
                {isRegister && <div className="field"><label htmlFor="auth-name">full name</label><input id="auth-name" type="text" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>}
                <div className="field"><label htmlFor="auth-email">university email</label><input id="auth-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
                <div className="field"><label htmlFor="auth-password">password</label><input id="auth-password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div>
                {isRegister && <div className="field"><label htmlFor="auth-password-confirmation">confirm password</label><input id="auth-password-confirmation" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} required /></div>}
                {!isRegister && <label className="remember"><input type="checkbox" checked={form.remember} onChange={(event) => setForm({ ...form, remember: event.target.checked })} /> Keep me signed in</label>}
                <button className="button auth-submit" disabled={submitting}>{submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'} <ChevronRight size={16} /></button>
            </form>
            <p className="auth-footnote">Your account stores your practical calculations securely with the Sugar Lab workspace.</p>
        </section>
        <aside className="auth-aside"><div className="eyebrow">Practical manual / 8211</div><h2>Measure carefully.<br /><em>Learn deeply.</em></h2><p>One workspace for guided sugar technology experiments, calculation records, safety checks, and report preparation.</p><div className="auth-aside-rule"><span>01</span> Interactive practical stations</div><div className="auth-aside-rule"><span>02</span> Saved calculation results</div><div className="auth-aside-rule"><span>03</span> Safety-first procedures</div></aside>
    </main>;
}

function LabApp({ user, onUserChange, onLogout }) {
    const [dashboard, setDashboard] = useState({ stats: {}, recent_sessions: [] });
    const [experiments, setExperiments] = useState([]);
    const [active, setActive] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('overview');
    const [allSessions, setAllSessions] = useState([]);

    useEffect(() => {
        Promise.all([fetch('/api/dashboard').then((res) => res.json()), fetch('/api/experiments').then((res) => res.json())])
            .then(([dash, catalog]) => { setDashboard(dash); setExperiments(catalog.experiments); });
    }, []);

    const refreshDashboard = () => fetch('/api/dashboard').then((res) => res.json()).then(setDashboard);
    const showResults = () => { setView('results'); fetch(user.role === 'teacher' ? '/api/teacher/sessions' : '/api/sessions').then((res) => res.json()).then((data) => setAllSessions(data.sessions ?? [])); };
    const showResources = () => setView('resources');
    const showSettings = () => setView('settings');
    const openExperiment = (id) => { setResult(null); setActive(id); };
    const close = () => { setActive(null); setResult(null); };

    const logout = async () => {
        const response = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content } });
        const data = await response.json();
        if (data.csrf_token) document.querySelector('meta[name="csrf-token"]').content = data.csrf_token;
        onLogout();
    };

    return <div className="shell">
        <header className="topbar"><div className="brand"><span className="brand-mark">SL</span><span><strong>Sugar Lab / 8211</strong><small>Sugarcane Processing and Sugar Technology</small></span></div><div className="institution"><span className="institution-seal">MU</span><span>MBEYA UNIVERSITY OF SCIENCE<br />AND TECHNOLOGY</span><i /> <span>Food Sciences<br />Department</span><span className="profile-dot" title={user.name}>{user.name.slice(0, 1).toUpperCase()}</span><button className="logout-button" onClick={logout} title="Sign out"><LogOut size={14} /> <span>Sign out</span></button></div></header>
        <div className="layout">
            <aside className="sidebar"><div className="eyebrow">Practical manual</div><nav className="nav">
                <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}><BookOpen size={16} /> Home</button><button className={`nav-item ${view === 'experiments' ? 'active' : ''}`} onClick={() => setView('experiments')}><FlaskConical size={16} /> Experiments</button><button className={`nav-item ${view === 'sessions' ? 'active' : ''}`} onClick={() => setView('sessions')}><History size={16} /> My Progress</button><button className={`nav-item ${view === 'results' ? 'active' : ''}`} onClick={showResults}><BarChart3 size={16} /> {user.role === 'teacher' ? 'All Experiments' : 'Results'}</button><button className={`nav-item ${view === 'safety' ? 'active' : ''}`} onClick={() => setView('safety')}><ShieldCheck size={16} /> Safety & Emergency</button><button className={`nav-item ${view === 'resources' ? 'active' : ''}`} onClick={showResources}><BookOpen size={16} /> Resources</button><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={showSettings}><span className="nav-gear">⚙</span> Settings</button>
            </nav><div className="side-foot"><strong><ShieldCheck size={15} /> Safety First</strong><br />Review the safety briefing before handling any simulated reagent or heated apparatus.</div></aside>
            <main className="main">
                {view === 'safety' ? <SafetyView /> : view === 'resources' ? <ResourcesView /> : view === 'settings' ? <SettingsView user={user} onUserChange={onUserChange} /> : view === 'sessions' ? <SessionsView sessions={dashboard.recent_sessions} /> : view === 'results' ? <ResultsView sessions={allSessions} teacher={user.role === 'teacher'} /> : view === 'experiments' ? <ExperimentsView experiments={experiments} openExperiment={openExperiment} /> : <>
                <section className="hero home-hero"><div><div className="eyebrow">Practical manual</div><h1>Sugarcane Processing and<br />Sugar Technology</h1><p>This interactive manual guides you through the practical procedures, materials, hazards and acceptance criteria for the AS 8211 practical program.</p></div><strong className="hero-quote">“Learn. Practice.<br />Achieve.”</strong></section>
                <section className="stats"><Stat label="completed runs" value={dashboard.stats.completed ?? 0} /><Stat label="active sessions" value={dashboard.stats.in_progress ?? 0} /><Stat label="practical modules" value={dashboard.stats.experiments ?? 3} /><Stat label="safety checks" value={dashboard.stats.safety_items ?? 8} /></section>
                <div className="section-head station-heading"><div><h2><FlaskConical size={22} /> Practical Stations</h2><span>Choose a practical to begin your laboratory session.</span></div></div>
                <section className="experiments">{experiments.map((experiment) => <article className={`experiment ${experiment.accent}`} key={experiment.id}><div><div className="station-top"><span className="station-icon">{experiment.id === 'orientation' ? '⚗' : experiment.id === 'lane-eynon' ? '▥' : '♨'}</span><span className="exp-number">PRACTICAL {experiment.number}</span><span className="station-status">{experiment.id === 'orientation' ? '●' : '▣'}</span></div><h3 className="exp-title">{experiment.title}</h3><p className="exp-desc">{experiment.description}</p></div><div className="exp-foot"><span>◷ · {experiment.duration}</span><button className="button" onClick={() => openExperiment(experiment.id)}>Start Station <ChevronRight size={15} /></button></div></article>)}</section>
                <div className="section-head"><h2>Recent sessions</h2><span className="eyebrow">live notebook</span></div>
                <section className="sessions"><div className="session-row header"><span>Student / sample</span><span>Practical</span><span>Result</span><span>Status</span></div>{dashboard.recent_sessions.length === 0 ? <div className="session-row"><span>No completed sessions yet.</span><span>Start with a practical above.</span></div> : dashboard.recent_sessions.map((session) => <div className="session-row" key={session.id}><span><strong>{session.student_name}</strong><br /><small>{session.sample_name}</small></span><span>{session.experiment === 'lane-eynon' ? 'Total sugar' : 'Ash'}</span><span>{session.result} {session.unit}</span><span className="pill">{session.status}</span></div>)}</section>
                <ReportWorkspace />
                </>}
            </main>
        </div>
        {active === 'orientation' && <Orientation onClose={close} />}
        {active === 'lane-eynon' && <CalculationModal title="Lane–Eynon method" initial={emptyLane} endpoint="/api/simulations/lane-eynon" fields={laneFields} guide={laneGuide} formulaLabel="Total sugar = ((F - M) x I x 250 x 100 x 100) / (W x A x 50)" onClose={close} onResult={(data) => { setResult(data); if (!data.error) refreshDashboard(); }} result={result} loading={loading} setLoading={setLoading} />}
        {active === 'ash' && <CalculationModal title="Gravimetric ash" initial={emptyAsh} endpoint="/api/simulations/ash" fields={ashFields} guide={ashGuide} formulaLabel="Ash = ((W3 - W1) x 100) / (W2 - W1)" onClose={close} onResult={(data) => { setResult(data); if (!data.error) refreshDashboard(); }} result={result} loading={loading} setLoading={setLoading} />}
    </div>;
}

function Stat({ label, value }) { return <div className="stat"><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong></div>; }

function ExperimentsView({ experiments, openExperiment }) { return <><section className="hero"><div><div className="eyebrow">Manual modules</div><h1>Run each practical<br /><em>step by step.</em></h1></div><div className="hero-copy">Each station follows the procedures, materials, hazards, and acceptance criteria in the AS 8211 practical manual.</div></section><div className="experiments">{experiments.map((experiment) => <article className={`experiment ${experiment.accent}`} key={experiment.id}><div><span className="exp-number">PRACTICAL {experiment.number}</span><h3 className="exp-title">{experiment.title}</h3><p className="exp-desc">{experiment.description}</p></div><div className="exp-foot"><span>{experiment.type} · {experiment.duration}</span><button className="button" onClick={() => openExperiment(experiment.id)}>Open station <ChevronRight size={15} /></button></div></article>)}</div></>; }

function SessionsView({ sessions }) { return <><section className="hero"><div><div className="eyebrow">Notebook archive</div><h1>Your practical<br /><em>sessions.</em></h1></div><div className="hero-copy">Every accepted calculation is kept with the readings used to produce it, ready to transfer into a practical report.</div></section><section className="sessions"><div className="session-row header"><span>Student / sample</span><span>Practical</span><span>Result</span><span>Status</span></div>{sessions.length === 0 ? <div className="session-row"><span>No completed sessions yet.</span><span>Run a practical to create your first record.</span></div> : sessions.map((session) => <div className="session-row" key={session.id}><span><strong>{session.student_name}</strong><br /><small>{session.sample_name}</small></span><span>{session.experiment === 'lane-eynon' ? 'Total sugar' : 'Ash'}</span><span>{session.result} {session.unit}</span><span className="pill">{session.status}</span></div>)}</section></>; }

function ResourcesView() {
    const resources = [
        ['Lane-Eynon method', 'Fehling standardization, inversion, neutralization, titration endpoints, and recovery criteria.'],
        ['Ash determination', 'Crucible conditioning, constant mass, controlled charring, furnace safety, and reporting.'],
        ['Practical report format', 'Title, abstract, introduction, materials and methods, results, discussion, conclusion, and references.'],
        ['Laboratory safety', 'PPE, chemical labeling, hot apparatus, emergency equipment, spills, and waste disposal.'],
    ];
    return <><section className="hero"><div><div className="eyebrow">Study library</div><h1>Resources for<br /><em>better practicals.</em></h1></div><div className="hero-copy">Use these focused notes before you enter a calculation station or prepare your report.</div></section><section className="resource-list">{resources.map(([title, description]) => <article className="resource-item" key={title}><BookOpen size={19} /><div><h2>{title}</h2><p>{description}</p></div><ChevronRight size={16} /></article>)}</section></>;
}

function SettingsView({ user, onUserChange }) {
    const [form, setForm] = useState({ name: user.name, email: user.email, password: '', password_confirmation: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const save = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');
        const response = await fetch('/auth/profile', { method: 'PUT', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify(form) });
        const data = await response.json();
        if (!response.ok) { setError(Object.values(data.errors ?? {}).flat().join(' ') || data.message || 'Unable to update your profile.'); return; }
        onUserChange(data.user);
        setForm({ ...form, password: '', password_confirmation: '' });
        setMessage('Profile updated successfully.');
    };
    return <><section className="hero"><div><div className="eyebrow">Account settings</div><h1>Your profile<br /><em>your details.</em></h1></div><div className="hero-copy">Change the name and email shown on your practical records, or set a new password.</div></section><section className="settings-panel"><div className="settings-role"><span className="eyebrow">Account type</span><strong>{user.role === 'teacher' ? 'Teacher' : 'Student'}</strong></div>{message && <div className="notice">{message}</div>}{error && <div className="auth-error">{error}</div>}<form onSubmit={save}><div className="form-grid"><div className="field"><label htmlFor="profile-name">full name</label><input id="profile-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div><div className="field"><label htmlFor="profile-email">email</label><input id="profile-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div><div className="field"><label htmlFor="profile-password">new password</label><input id="profile-password" type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Leave blank to keep current" /></div><div className="field"><label htmlFor="profile-password-confirmation">confirm new password</label><input id="profile-password-confirmation" type="password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /></div></div><div className="form-actions"><button className="button">Save profile</button></div></form></section></>;
}

function ResultsView({ sessions }) {
    const sugar = sessions.filter((session) => session.experiment === 'lane-eynon');
    const ash = sessions.filter((session) => session.experiment === 'ash');
    const average = (items) => items.length ? (items.reduce((sum, item) => sum + Number(item.result), 0) / items.length).toFixed(2) : '0.00';
    return <><section className="hero"><div><div className="eyebrow">Results / analysis</div><h1>See what the<br /><em>lab found.</em></h1></div><div className="hero-copy">Compare completed simulations, inspect the recorded values, and use both trend and comparison views when several samples have been tested.</div></section><section className="stats result-stats"><Stat label="all results" value={sessions.length} /><Stat label="sugar analyses" value={sugar.length} /><Stat label="average sugar" value={`${average(sugar)} g`} /><Stat label="average ash" value={`${average(ash)} g`} /></section><div className="results-charts"><section className="chart-panel"><div className="section-head"><h2>Linear trend</h2><span className="eyebrow">sequence over time</span></div><ResultChart sessions={sessions} /></section><section className="chart-panel"><div className="section-head"><h2>Bar comparison</h2><span className="eyebrow">g per 100 g</span></div><BarChart sessions={sessions} /></section></div><section className="results-table"><div className="section-head"><h2>Recorded results</h2><span className="eyebrow">{sessions.length} entries</span></div>{sessions.length === 0 ? <div className="empty-results">No results yet. Complete a calculation from Experiments.</div> : sessions.map((session) => <div className="result-row" key={session.id}><div><strong>{session.sample_name}</strong><small>{session.student_name} · {session.experiment === 'lane-eynon' ? 'Total sugar' : 'Ash'}</small></div><strong>{session.result}</strong><span className="pill">{session.status}</span></div>)}</section></>;
}

function ResultChart({ sessions }) {
    if (sessions.length === 0) return <div className="empty-results">Run at least one simulation to populate the graph.</div>;
    const width = 720;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 38, left: 44 };
    const max = Math.max(...sessions.map((session) => Number(session.result)), 1);
    const x = (index) => padding.left + (index * (width - padding.left - padding.right)) / Math.max(sessions.length - 1, 1);
    const y = (value) => height - padding.bottom - (Number(value) / max) * (height - padding.top - padding.bottom);
    const points = sessions.map((session, index) => `${x(index)},${y(session.result)}`).join(' ');
    return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Simulation result trend chart"><line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="chart-axis" /><line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="chart-axis" /><polyline points={points} className="chart-line" />{sessions.map((session, index) => <g key={session.id}><circle cx={x(index)} cy={y(session.result)} r="5" className={session.experiment === 'ash' ? 'chart-dot ash-dot' : 'chart-dot'} /><text x={x(index)} y={height - 14} textAnchor="middle" className="chart-label">{index + 1}</text></g>)}</svg><div className="chart-legend"><span><i className="legend-dot sugar-dot" /> Total sugar</span><span><i className="legend-dot ash-dot" /> Ash</span></div></div>;
}

function BarChart({ sessions }) {
    if (sessions.length === 0) return <div className="empty-results">Run at least one simulation to populate the graph.</div>;
    const width = 720;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 42, left: 44 };
    const max = Math.max(...sessions.map((session) => Number(session.result)), 1);
    const slot = (width - padding.left - padding.right) / sessions.length;
    const barWidth = Math.min(44, slot * .58);
    const barHeight = (value) => (Number(value) / max) * (height - padding.top - padding.bottom);
    return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Simulation result bar chart"><line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="chart-axis" />{sessions.map((session, index) => { const currentHeight = barHeight(session.result); const currentX = padding.left + index * slot + (slot - barWidth) / 2; const currentY = height - padding.bottom - currentHeight; return <g key={session.id}><rect x={currentX} y={currentY} width={barWidth} height={currentHeight} rx="4" className={session.experiment === 'ash' ? 'chart-bar ash-bar' : 'chart-bar'} /><text x={currentX + barWidth / 2} y={height - 16} textAnchor="middle" className="chart-label">{index + 1}</text></g>; })}</svg><div className="chart-legend"><span><i className="legend-dot sugar-dot" /> Total sugar</span><span><i className="legend-dot ash-dot" /> Ash</span></div></div>;
}

function SafetyView() { const rules = ['Wear a clean lab coat, safety glasses, and prescribed protective equipment.', 'Do not eat, drink, smoke, or store food in chemical refrigerators.', 'Label every chemical with its name, concentration, preparation date, and student name.', 'Never pipette by mouth, sniff chemicals directly, or return reagents to stock bottles.', 'Report accidents, broken apparatus, spills, and maintenance problems immediately.', 'Use tongs and face or eye protection around hot crucibles, ovens, and furnaces.', 'Autoclave biological material and dispose of broken glass in designated bins.', 'Know the location of emergency exits, phones, showers, eyewash, fire equipment, and first aid.']; return <><section className="hero"><div><div className="eyebrow">Safety gate</div><h1>Safety is part of<br /><em>the practical.</em></h1></div><div className="hero-copy">Review these rules before any simulated chemical, heat, or biological-material workflow.</div></section><div className="safety-list">{rules.map((rule, index) => <div className="safety-row" key={rule}><span className="safety-index">0{index + 1}</span><span>{rule}</span><CheckCircle2 size={18} /></div>)}</div></>; }

function ReportWorkspace() { return <section className="report-workspace"><div><div className="eyebrow">Report builder</div><h2>Structure your practical report</h2><p className="hero-copy">Use the manual’s research-article format: title, abstract, introduction, materials and methods, results, discussion, conclusion, and references.</p></div><div className="report-grid">{['Title', 'Abstract', 'Introduction', 'Materials and methods', 'Results', 'Discussion', 'Conclusion', 'References · minimum 5'].map((section) => <div className="report-section" key={section}><span>{section}</span><CheckCircle2 size={15} /></div>)}</div></section>; }

const laneFields = [['student_name', 'student name', 'text'], ['sample_name', 'sample name', 'text'], ['weight', 'sample weight (g)', 'number'], ['aliquot', 'aliquot (mL)', 'number'], ['standard_factor', 'standard factor I (g/mL)', 'number'], ['fehling_volume', 'Fehling standard F (mL)', 'number'], ['sample_volume', 'sample titration M (mL)', 'number'], ['spiked_sugar_percent', 'spiked sample (%) · optional', 'number'], ['sample_sugar_percent', 'unspiked sample (%) · optional', 'number'], ['sugar_added_percent', 'added sugar (%) · optional', 'number']];
const ashFields = [['student_name', 'student name', 'text'], ['sample_name', 'sample name', 'text'], ['crucible_weight', 'W1 · crucible (g)', 'number'], ['sample_weight', 'W2 · crucible + sample (g)', 'number'], ['ash_weight', 'W3 · crucible + ash (g)', 'number']];
const laneGuide = { materials: 'Burette, analytical balance, volumetric flask, water bath, heater-stirrer, Fehling solutions, HCl, NaOH, phenolphthalein, methylene blue, and working standard sugar solution.', hazards: 'Wear eye protection. Handle HCl, NaOH, hot glassware, and boiling solutions with the prescribed protection.', steps: ['Homogenize the sample, weigh it into a 250 mL volumetric flask, dilute, mix, and filter.', 'Pipette 50 mL filtrate, invert overnight with concentrated HCl, then neutralize and dilute to 100 mL.', 'Standardize mixed Fehling solution by titrating with working standard sugar solution while boiling.', 'Titrate the hydrolyzed sample to the bright orange endpoint and record F and M.', 'Accept duplicates when they differ by no more than 10% of the mean; recovery must be 80–110%.'] };
const ashGuide = { materials: 'Desiccator, tongs, porcelain crucible, analytical balance, hotplate or Bunsen burner, and furnace controlled at 500–550°C.', hazards: 'Use tongs, gloves, and face or eye protection when handling hot crucibles and opening the furnace.', steps: ['Heat the marked crucible at 500–550°C for 2–3 hours, cool in a desiccator, and record W1.', 'Weigh the sample into the crucible and record W2.', 'Pre-dry wet samples; char all samples gradually on a hotplate until smoking stops.', 'Incinerate until the residue is uniformly white, cool in a desiccator, and record W3.', 'Repeat heating and cooling if needed until constant mass is obtained; report to one decimal place.'] };

function CalculationModal({ title, initial, endpoint, fields, guide, formulaLabel, onClose, onResult, result, loading, setLoading }) {
    const [form, setForm] = useState(initial);
    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        const csrfResponse = await fetch('/auth/csrf', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrf_token;
        document.querySelector('meta[name="csrf-token"]').content = csrfToken;
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify(form),
        });
        const data = await response.json();
        setLoading(false);
        if (!response.ok) {
            onResult({ error: Object.values(data.errors ?? {}).flat().join(' ') || data.message || 'Check the values and try again.' });
            return;
        }
        onResult(data);
    };
    return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><div className="eyebrow">Calculation station</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div><div className="notice"><Calculator size={15} style={{ verticalAlign: 'middle' }} /> Enter the readings from your bench. The simulator applies the formula from the practical manual and stores the completed session.</div><div className="guide"><strong>Materials</strong><p>{guide.materials}</p><strong>Hazards</strong><p>{guide.hazards}</p><strong>Procedure</strong><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></div><form onSubmit={submit}><div className="form-grid">{fields.map(([name, label, type]) => <div className="field" key={name}><label htmlFor={name}>{label}</label><input id={name} type={type} step={type === 'number' ? 'any' : undefined} required={!label.includes('optional')} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} /></div>)}</div><div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button" disabled={loading}>{loading ? 'Calculating...' : 'Run calculation'}</button></div></form>{result && (result.error ? <div className="notice" style={{ marginTop: 16 }}>{result.error}</div> : <div className="result"><small><CheckCircle2 size={14} /> RESULT ACCEPTED: {result.accepted ? 'WITHIN MANUAL CRITERIA' : 'REVIEW ACCEPTANCE CRITERIA'}</small><strong>{result.result} <span style={{ fontSize: 14, letterSpacing: 0 }}>{result.session.unit}</span></strong><small>{formulaLabel}{result.recovery ? ` · Recovery ${result.recovery}%` : ''}</small></div>)}</div></div>;
}

function Orientation({ onClose }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><div className="eyebrow">Practical 01</div><h2>Laboratory orientation</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div><p className="hero-copy">Before starting an analysis, confirm that you know the location and operation of the emergency exits, phone, fire alarm, extinguishers, safety shower, eyewash, and first aid kit.</p><div className="notice"><strong>Orientation checklist</strong><br />Wear your lab coat and safety glasses. Keep work surfaces clean. Label all chemical solutions. Report accidents, spills, broken apparatus, and maintenance problems immediately.</div><div className="form-actions"><button className="button" onClick={onClose}>Mark briefing reviewed <CheckCircle2 size={16} /></button></div></div></div>; }