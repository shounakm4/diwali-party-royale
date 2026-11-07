import Link from "next/link";
import {
  ArrowRight,
  Smartphone,
  Sparkles,
  Users,
  Zap,
  Monitor,
  WandSparkles,
  MessageCircleQuestion,
  Crown,
} from "lucide-react";
import { Decor, Diya } from "@/components/Decor";
export default function Home() {
  return (
    <main className="landing">
      <Decor />
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span> PARTY ROYALE
          <span className="edition">DIWALI EDITION</span>
        </Link>
        <Link href="/join" className="nav-join">
          Got a room code? <ArrowRight size={16} />
        </Link>
      </nav>
      <section className="hero">
        <div className="eyebrow">
          <span className="live-dot" /> YOUR LIVING ROOM. OUR GAME SHOW.
        </div>
        <h1>
          Good friends.
          <br />
          Great bluffs.
          <br />
          <span>Full-on Diwali.</span>
          <span className="hero-spark">✧</span>
        </h1>
        <p>
          Light the diyas. Put your friendships to the test.
          <br />
          Your next legendary party starts right here.
        </p>
        <div className="hero-actions">
          <Link href="/host" className="button primary">
            Host a party <ArrowRight size={19} />
          </Link>
          <Link href="/join" className="button secondary">
            <Smartphone size={19} /> Join the fun
          </Link>
        </div>
        <div className="hero-meta">
          <span>
            <Users size={15} /> 2–8 friends
          </span>
          <span>
            <Smartphone size={15} /> Your phone is the controller
          </span>
          <span>No downloads. No logins.</span>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="floating-card card-one">
            <span className="mini-label">THE BLUFF IS REAL</span>
            <div className="art-avatar">😎</div>
            <strong>Trust me, bro.</strong>
            <span className="tiny-tag">+500 · SOMEONE BOUGHT IT</span>
          </div>
          <div className="floating-card card-two">
            <span className="mini-label">WHO’S MOST LIKELY TO…</span>
            <span className="big-emoji">👀</span>
            <strong>
              We all know
              <br />
              it’s you.
            </strong>
            <div className="mini-votes">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="diya-plate">
            <Diya />
            <span>LET THE GOOD TIMES GLOW</span>
          </div>
          <div className="art-sticker">
            <Sparkles size={14} /> 100% festive chaos
          </div>
          <span className="art-star star-a">✦</span>
          <span className="art-star star-b">✳</span>
        </div>
      </section>
      <section className="games-section">
        <div className="section-heading">
          <div>
            <span className="kicker">THE PARTY MENU</span>
            <h2>Two games. Zero awkward small talk.</h2>
          </div>
          <span className="handwritten">Choose your kind of chaos ↙</span>
        </div>
        <div className="game-grid">
          <Link href="/host?game=bluff" className="game-card bluff-card">
            <div className="game-card-top">
              <span className="game-icon">
                <WandSparkles size={26} />
              </span>
              <span className="pill">THE ART OF BELIEVABLE NONSENSE</span>
              <ArrowRight className="card-arrow" />
            </div>
            <h3>
              Bluff Masters<span>A little lie goes a long way.</span>
            </h3>
            <p>
              A weird fact. A very convincing lie. Can your friends
              <br className="desktop-only" /> spot the truth, or will they fall
              for your masterpiece?
            </p>
            <footer>
              <span>5 rounds</span>
              <span>✦</span>
              <span>Big lies. Bigger points.</span>
              <span className="game-number">01</span>
            </footer>
          </Link>
          <Link href="/host?game=likely" className="game-card likely-card">
            <div className="game-card-top">
              <span className="game-icon">
                <MessageCircleQuestion size={26} />
              </span>
              <span className="pill">YOU KNOW YOUR FRIENDS. RIGHT?</span>
              <ArrowRight className="card-arrow" />
            </div>
            <h3>Who’s Most Likely To?</h3>
            <p>
              The group chat has entered the game.
              <br />
              Vote anonymously. Predict the chaos. Defend nothing.
            </p>
            <footer>
              <span>8 rounds</span>
              <span>✦</span>
              <span>Friendly call-outs only.</span>
              <span className="game-number">02</span>
            </footer>
          </Link>
        </div>
      </section>
      <section className="how">
        <div>
          <Monitor />
          <span>
            <strong>1. Big screen on.</strong>
            <small>Open the host on your laptop or TV.</small>
          </span>
        </div>
        <span className="how-arrow">→</span>
        <div>
          <Smartphone />
          <span>
            <strong>2. Phones out.</strong>
            <small>Scan the QR. Pick a nickname.</small>
          </span>
        </div>
        <span className="how-arrow">→</span>
        <div>
          <Crown />
          <span>
            <strong>3. Make it legendary.</strong>
            <small>Play, bluff, vote. Claim the crown.</small>
          </span>
        </div>
      </section>
      <footer className="site-footer">
        <span>✳ A little light. A lot of laughter.</span>
        <span>
          MADE FOR YOUR FAVOURITE PEOPLE <Zap size={12} />
        </span>
      </footer>
    </main>
  );
}
