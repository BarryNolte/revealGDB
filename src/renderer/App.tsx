export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gw = window as any;

  return (
    <div style={{ padding: 20, fontFamily: "system-ui,Segoe UI,Roboto" }}>
      <h1>revealGDB!</h1>
      <p>A minimal Electron + React + TypeScript starter.</p>
      <button onClick={() => alert(gw.revealGDB?.echo("hello from preload blah blah"))}>
        Test Preload
      </button>
    </div>
  );
}
