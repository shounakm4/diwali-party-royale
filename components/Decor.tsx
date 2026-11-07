export function Diya({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 150"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glow">
          <stop stopColor="#ffb939" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffb939" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="flame"
          x1="90"
          y1="20"
          x2="90"
          y2="94"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff9cd" />
          <stop offset=".55" stopColor="#ffd867" />
          <stop offset="1" stopColor="#ff873d" />
        </linearGradient>
        <linearGradient id="bowl">
          <stop stopColor="#e8a244" />
          <stop offset="1" stopColor="#a64821" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="70" r="70" fill="url(#glow)" />
      <path
        d="M91 22C91 45 65 54 73 75C79 94 106 94 111 74C117 55 96 44 91 22Z"
        fill="url(#flame)"
      />
      <path d="M91 60C89 70 83 76 87 83C94 91 102 80 97 72Z" fill="#fff8c3" />
      <ellipse
        cx="90"
        cy="100"
        rx="64"
        ry="14"
        fill="#6c2a24"
        stroke="#f6c378"
        strokeWidth="2"
      />
      <path
        d="M26 100C32 148 148 148 154 100C124 118 57 118 26 100Z"
        fill="url(#bowl)"
      />
      <path
        d="M38 110Q90 143 142 110M52 124Q90 143 128 124"
        stroke="#ffd68b"
        strokeWidth="2"
        strokeDasharray="3 5"
      />
      <path
        d="M91 96L92 87"
        stroke="#ffe6a4"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <div className="rangoli rangoli-one" />
      <div className="rangoli rangoli-two" />
      <div className="fairylights">
        {Array.from({ length: 15 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${i * 7}%`,
              top: `${Math.sin(i * 0.45) * 22 + 8}px`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <div className="stars">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
    </div>
  );
}
