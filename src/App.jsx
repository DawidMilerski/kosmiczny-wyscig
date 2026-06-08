// src/App.jsx
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import Game from './Game'

export default function App() {
  const [gameState, setGameState] = useState('MENU') 
  const [score, setScore] = useState(0)
  const [coinsCollected, setCoinsCollected] = useState(0)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      
      {/* WARSTWA 1: GRA 3D */}
      <Canvas key={gameState} camera={{ position: [0, 4, 8], fov: 60 }}>
        <fog attach="fog" args={['#000000', 10, 60]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        
        {/* GWIAZDY DLA MENU GŁÓWNEGO */}
        {gameState === 'MENU' && (
          <group>
            {/* Ta mikroskopijna, niewidzialna kostka zmusza Canvas do prawidłowego wyrenderowania gwiazd w menu */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.001, 0.001, 0.001]} />
              <meshBasicMaterial color="black" transparent opacity={0} />
            </mesh>
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          </group>
        )}

        {/* Właściwa gra włącza się po wyjściu z menu */}
        {gameState !== 'MENU' && (
          <Game 
            gameState={gameState} 
            setGameState={setGameState} 
            setScore={setScore} 
            setCoinsCollected={setCoinsCollected}
          />
        )}
      </Canvas>

      {/* WARSTWA 2: INTERFEJS 2D */}
      
      {/* Menu Główne - Przywrócone do stabilnego, ciemnego tła bez żadnego migania */}
      {gameState === 'MENU' && (
        <div style={overlayStyle}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', color: '#ff007f' }}>KOSMICZNY WYŚCIG</h1>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: '#00ffff' }}>POZIOM 1</h2>
          <p style={{ marginBottom: '30px', color: '#ccc' }}>Dojedź do końca trasy (1000 pkt). Unikaj wież, zbieraj złote monety!</p>
          <button style={buttonStyle} onClick={() => { setScore(0); setCoinsCollected(0); setGameState('PLAYING'); }}>
            POZIOM 1
          </button>
        </div>
      )}

      {/* Licznik punktów i informacja o poziomie w trakcie gry */}
      {gameState === 'PLAYING' && (
        <div style={ingameHUDStyle}>
          <div style={{ fontSize: '1rem', color: '#00ffff', letterSpacing: '2px', marginBottom: '5px' }}>
            POZIOM 1
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
            DYSTANS: {score} / 1000
          </div>
          <div style={{ fontSize: '1.8rem', color: '#ffd700', marginTop: '5px', display: 'flex', alignItems: 'center' }}>
            🪙 MONETY: {coinsCollected}
          </div>
        </div>
      )}

      {/* Ekran Wygranej */}
      {gameState === 'WIN' && (
        <div style={{ ...overlayStyle, background: 'rgba(0, 40, 20, 0.8)' }}>
          <h1 style={{ fontSize: '3.5rem', color: '#00ffcc', marginBottom: '10px', textShadow: '0 0 20px #00ffcc' }}>
            POZIOM UKOŃCZONY!
          </h1>
          
          <div style={statsBoxStyle}>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🏁 Przejechany dystans:</span> 
              <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{score} metrów</span>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🪙 Zebrane monety:</span> 
              <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{coinsCollected} szt.</span>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>⭐ Bonus za monety:</span> 
              <span style={{ color: '#00ffff', fontWeight: 'bold' }}>+{coinsCollected * 100} pkt</span>
            </p>
            
            <hr style={{ borderColor: '#444', margin: '15px 0' }} />
            
            <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 'bold' }}>
              <span>WYNIK KOŃCOWY:</span> 
              <span style={{ color: '#ff007f' }}>{score + (coinsCollected * 100)}</span>
            </p>
          </div>

          <button style={{ ...buttonStyle, background: '#00cc88' }} onClick={() => setGameState('MENU')}>
            WRÓĆ DO MENU
          </button>
        </div>
      )}

      {/* Ekran Przegranej */}
      {gameState === 'GAMEOVER' && (
        <div style={gameOverOverlayStyle}>
          <h1 style={{ fontSize: '3rem', color: 'red', marginBottom: '10px' }}>KONIEC GRY</h1>
          
          <div style={statsBoxStyle}>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💀 Postęp poziomu:</span>
              <span style={{ color: 'red', fontWeight: 'bold' }}>{Math.floor((score/1000)*100)}%</span>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🏁 Dystans:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{score} / 1000</span>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🪙 Zebrane monety:</span>
              <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{coinsCollected} szt.</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', width: '420px' }}>
            <button style={buttonStyle} onClick={() => { setScore(0); setCoinsCollected(0); setGameState('PLAYING'); }}>
              SPRÓBUJ PONOWNIE
            </button>

            <button 
              style={{ ...buttonStyle, background: '#333', color: '#ccc', fontSize: '1.2rem', padding: '10px 20px' }} 
              onClick={() => setGameState('MENU')}
            >
              MENU GŁÓWNE
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

const overlayStyle = {
  position: 'absolute',
  top: 0, left: 0,
  width: '100%', height: '100%',
  display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center',
  color: 'white',
  background: 'rgba(0, 0, 0, 0.75)', // 0.75 daje idealną widoczność gwiazd z tyłu
  zIndex: 10
}

const gameOverOverlayStyle = {
  position: 'absolute',
  top: 0, left: 0,
  width: '100%', height: '100%',
  display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center',
  color: 'white',
  background: 'rgba(15, 0, 0, 0.5)',     
  backdropFilter: 'blur(15px)',          
  WebkitBackdropFilter: 'blur(15px)',
  zIndex: 10
}

const statsBoxStyle = {
  background: 'rgba(20, 20, 25, 0.8)',
  border: '1px solid #444',
  borderRadius: '12px',
  padding: '25px 35px',
  marginBottom: '25px',
  width: '420px',           
  fontSize: '1.2rem',
  lineHeight: '2.2rem',
  textAlign: 'left'
}

const buttonStyle = {
  padding: '15px 40px',
  fontSize: '1.5rem',
  background: '#ff007f',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  width: '420px',          
  textAlign: 'center',
  transition: '0.2s'
}

const ingameHUDStyle = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 5, 
  pointerEvents: 'none', 
  textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.5)'
}