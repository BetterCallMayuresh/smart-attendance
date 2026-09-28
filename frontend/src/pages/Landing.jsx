import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="navbar-brand">
          <span className="navbar-logo">📡</span>
          <span className="navbar-title">SmartAttend</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-secondary">Sign in</Link>
          <Link to="/register" className="btn btn-primary">Create account</Link>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">Computer Networks · Live presence</p>
        <h1>Attendance that watches the LAN, not the roll call.</h1>
        <p className="hero-lead">
          ARP scans on the classroom Wi-Fi, MAC-to-student matching, confidence scoring,
          and a live faculty radar — all without RFID or biometrics.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary">Open the command center</Link>
          <a href="#flow" className="btn btn-secondary">See the packet path</a>
        </div>
        <p className="demo-hint">
          Demo logins: <code>faculty@smartattend.edu</code> / <code>Demo@123</code>
        </p>
      </section>

      <section className="arch-flow" id="flow">
        <div className="arch-node">
          <span>01</span>
          <h3>Student device</h3>
          <p>Joins classroom Wi-Fi. NIC appears in the AP ARP table.</p>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node">
          <span>02</span>
          <h3>Presence service</h3>
          <p>Node scanner polls <code>arp -a</code> and streams MAC/IP events.</p>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node">
          <span>03</span>
          <h3>Spring backend</h3>
          <p>Matches approved MAC, scores confidence, persists AUTO attendance.</p>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node">
          <span>04</span>
          <h3>Faculty radar</h3>
          <p>STOMP push lights a blip the moment the device is seen.</p>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <h3>Presence confidence</h3>
          <p>HIGH / MEDIUM / LOW from approved MAC, scan recency, campus subnet, and IP-clone penalties.</p>
        </article>
        <article>
          <h3>Demo classroom</h3>
          <p>Inject a full ARP roster in seconds — viva-ready even off the lab network.</p>
        </article>
        <article>
          <h3>Analytics</h3>
          <p>Course trends, method split, and students under 75% with CSV + PDF export.</p>
        </article>
      </section>
    </div>
  );
}
