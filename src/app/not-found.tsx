export default function NotFound() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#3f2d2c',
      }}
    >
      {/* Header label at the top */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center" style={{ paddingTop: '28px' }}>
        <a href="/" className="lowercase text-base" style={{ color: '#6B5654', textDecoration: 'none' }}>
          laurent del rey
        </a>
      </header>

      {/* Centered 404 message */}
      <div className="flex items-center justify-center" style={{ height: '100%', pointerEvents: 'none' }}>
        <p className="lowercase" style={{ color: '#6B5654' }}>page not found</p>
      </div>
    </div>
  );
}

