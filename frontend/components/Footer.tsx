const Footer = () => {
  return (
    <footer className="mt-12 border-t-4 border-t-green-500 relative z-10" style={{
      background: "linear-gradient(135deg, rgba(0, 26, 13, 0.95) 0%, rgba(10, 46, 28, 0.95) 100%)",
      boxShadow: "0 -4px 0 rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 100, 0.3)"
    }}>
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-lg mb-3" style={{
          color: "#00ffff",
          textShadow: "2px 2px 0px #00ff00, 4px 4px 0px rgba(0, 0, 0, 0.5)"
        }}>
          © 2025 DEALIFI • ALL RIGHTS RESERVED
        </p>
        <p className="text-sm mb-4" style={{
          color: "#ffff00",
          textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
        }}>
          🐵 BUILT FOR THE MONKEDAO CYPHERPUNK HACKATHON 🐵
        </p>
        <div className="flex justify-center gap-6 text-xl">
          <span style={{
            color: "#00ff00",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
          }}>⚡</span>
          <span style={{
            color: "#00ffff",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
          }}>💎</span>
          <span style={{
            color: "#ffff00",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
          }}>🚀</span>
          <span style={{
            color: "#00ff00",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
          }}>🎮</span>
          <span style={{
            color: "#00ffff",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
          }}>⭐</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
