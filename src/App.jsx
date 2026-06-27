import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import Game from './Game'

// Lista kolorów gracza
const SHOP_COLORS = [
  '#ff007f', '#ff5500', '#ffaa00', '#ffee00', '#aaff00',
  '#00ff00', '#00ffaa', '#00ffff', '#00aaff', '#0055ff',
  '#0000ff', '#5500ff', '#aa00ff', '#ff00ff', '#ff00aa',
  '#ff3333', '#33ff33', '#3333ff', '#ffff33', '#33ffff',
  '#ffd700', '#ff69b4', '#00fa9a', '#1e90ff', '#9400d3'
]

// Lista utworów
const GAME_PLAYLIST = [
  '/music.mp3',
  '/music2.mp3',
  '/music3.mp3',
  '/music4.mp3',
  '/music5.mp3',
  '/music6.mp3',
  '/music7.mp3',
  '/music8.mp3',
]

export default function App() {
  const [gameState, setGameState] = useState('MENU') 
  const [score, setScore] = useState(0)
  const [coinsCollected, setCoinsCollected] = useState(0)
  const [level, setLevel] = useState('EASY') 

  const [totalCoins, setTotalCoins] = useState(0)
  const [highscores, setHighscores] = useState({ EASY: 0, MEDIUM: 0, HARD: 0 })

  const [activeColor, setActiveColor] = useState('#ff007f')
  const [ownedColors, setOwnedColors] = useState(['#ff007f'])

  const [isMuted, setIsMuted] = useState(false)
  const musicRef = useRef(null)
  const clickAudio = useRef(null)
  const crashAudio = useRef(null)
  const winAudio = useRef(null)

  // Inicjalizacja audio
  const initAudio = () => {
    if (!musicRef.current) {
      musicRef.current = new Audio(GAME_PLAYLIST[0])
      musicRef.current.loop = true
      musicRef.current.volume = 0.2
      musicRef.current.muted = isMuted
    }
    if (!clickAudio.current) {
      clickAudio.current = new Audio('/click.mp3')
      clickAudio.current.volume = 0.3
      clickAudio.current.muted = isMuted
    }
    if (!crashAudio.current) {
      crashAudio.current = new Audio('/crash.mp3')
      crashAudio.current.volume = 0.6
      crashAudio.current.muted = isMuted
    }
    if (!winAudio.current) {
      winAudio.current = new Audio('/win.mp3')
      winAudio.current.volume = 0.5
      winAudio.current.muted = isMuted
    }
  }

  useEffect(() => {
    const savedCoins = localStorage.getItem('total_coins')
    const savedEasy = localStorage.getItem('highscore_EASY')
    const savedMedium = localStorage.getItem('highscore_MEDIUM')
    const savedHard = localStorage.getItem('highscore_HARD')
    const savedActiveColor = localStorage.getItem('active_color')
    const savedOwnedColors = localStorage.getItem('owned_colors')
    const savedMute = localStorage.getItem('game_muted')

    if (savedCoins) setTotalCoins(parseInt(savedCoins))
    setHighscores({
      EASY: savedEasy ? parseInt(savedEasy) : 0,
      MEDIUM: savedMedium ? parseInt(savedMedium) : 0,
      HARD: savedHard ? parseInt(savedHard) : 0
    })

    if (savedActiveColor) setActiveColor(savedActiveColor)
    if (savedOwnedColors) setOwnedColors(JSON.parse(savedOwnedColors))
    if (savedMute) setIsMuted(savedMute === 'true')
  }, [])

  // Wyciszenie elementów audio
  useEffect(() => {
    if (musicRef.current) musicRef.current.muted = isMuted
    if (clickAudio.current) clickAudio.current.muted = isMuted
    if (crashAudio.current) crashAudio.current.muted = isMuted
    if (winAudio.current) winAudio.current.muted = isMuted
    localStorage.setItem('game_muted', isMuted)
  }, [isMuted])

  // Zatrzymywanie muzyki przy wyjściu ze stanu PLAYING
  useEffect(() => {
    if (gameState !== 'PLAYING' && musicRef.current) {
      musicRef.current.pause()
    }
  }, [gameState])

  // Dźwięk przycisku
  const playClick = () => {
    initAudio()
    if (clickAudio.current) {
      clickAudio.current.currentTime = 0
      clickAudio.current.play().catch(() => {})
    }
  }

  // Uruchomienie gry
  const startGame = (chosenLevel) => {
    initAudio()
    setScore(0)
    setCoinsCollected(0)
    setLevel(chosenLevel)
    setGameState('PLAYING')

    if (musicRef.current) {
      const randomIndex = Math.floor(Math.random() * GAME_PLAYLIST.length)
      musicRef.current.src = GAME_PLAYLIST[randomIndex]
      musicRef.current.currentTime = 0
      musicRef.current.play().catch((e) => console.log("Błąd odtwarzania muzyki:", e))
    }
  }

  const updateSavedData = (finalScore, finalCoins) => {
    const newTotalCoins = totalCoins + finalCoins
    setTotalCoins(newTotalCoins)
    localStorage.setItem('total_coins', newTotalCoins)

    const currentRecord = highscores[level]
    if (finalScore > currentRecord) {
      const updatedHighscores = { ...highscores, [level]: finalScore }
      setHighscores(updatedHighscores)
      localStorage.setItem(`highscore_${level}`, finalScore)
    }
  }

  const changeGameState = (newState, finalScoreOverride = null) => {
    if (newState === 'WIN' || newState === 'GAMEOVER') {
      if (newState === 'GAMEOVER' && crashAudio.current) {
        crashAudio.current.currentTime = 0
        crashAudio.current.play().catch((e) => console.log("Błąd odtwarzania crash:", e))
      }
      
      if (newState === 'WIN' && winAudio.current) {
        winAudio.current.currentTime = 0
        winAudio.current.play().catch((e) => console.log("Błąd odtwarzania win:", e))
      }
      const exactScore = finalScoreOverride !== null ? finalScoreOverride : score
      updateSavedData(exactScore, coinsCollected)
    }
    setGameState(newState)
  }

  const handleColorClick = (color) => {
    playClick()
    if (ownedColors.includes(color)) {
      setActiveColor(color)
      localStorage.setItem('active_color', color)
    } else {
      if (totalCoins >= 100) {
        const newCoins = totalCoins - 100
        const newOwned = [...ownedColors, color]
        
        setTotalCoins(newCoins)
        setOwnedColors(newOwned)
        setActiveColor(color)

        localStorage.setItem('total_coins', newCoins)
        localStorage.setItem('owned_colors', JSON.stringify(newOwned))
        localStorage.setItem('active_color', color)
      } else {
        alert('Masz za mało monet żeby kupić ten kolor!')
      }
    }
  }

  const getLevelName = () => {
    if (level === 'EASY') return 'ŁATWY'
    if (level === 'MEDIUM') return 'ŚREDNI'
    return 'TRUDNY'
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      
      {/* PRZYCISK WYCISZENIA */}
      <button 
        onClick={() => { initAudio(); setIsMuted(!isMuted); }}
        style={{
          position: 'absolute',
          top: '20px', right: '20px',
          zIndex: 100,
          background: 'rgba(20, 20, 25, 0.7)',
          border: '1px solid #444',
          borderRadius: '50%',
          width: '50px', height: '50px',
          fontSize: '1.5rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', transition: '0.2s'
        }}
        title={isMuted ? "Włącz dźwięk" : "Wycisz grę"}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* WARSTWA 1: GRA 3D */}
      <Canvas key={gameState} camera={{ position: [0, 4, 8], fov: 60 }}>
        <fog attach="fog" args={['#000000', 10, 60]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        
        {gameState === 'MENU' && (
          <group>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.001, 0.001, 0.001]} />
              <meshBasicMaterial color="black" transparent opacity={0} />
            </mesh>
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          </group>
        )}

        {gameState === 'PLAYING' && (
          <Game 
            gameState={gameState} 
            setGameState={changeGameState}
            setScore={setScore} 
            setCoinsCollected={setCoinsCollected}
            level={level}
            playerColor={activeColor}
            isMuted={isMuted}
            initAudioParent={initAudio}
          />
        )}
      </Canvas>

      {/* WARSTWA 2: INTERFEJS 2D */}
      
      {/* Menu Główne */}
      {gameState === 'MENU' && (
        <div style={overlayStyle}>
          <h1 style={{ fontSize: '3rem', marginBottom: '5px', color: '#ff007f' }}>KOSMICZNY WYŚCIG</h1>
          
          <div style={{ fontSize: '1.4rem', color: '#ffd700', marginBottom: '25px', fontWeight: 'bold' }}>
            🪙 ZGROMADZONE MONETY: {totalCoins}
          </div>

          <p style={{ marginBottom: '20px', color: '#ccc' }}>Unikaj wież, zbieraj złote monety!</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>  
            
            {/* Poziom Łatwy */}
            <button 
              style={{ ...buttonStyle, background: '#ff007f', color: '#fff' }} 
              onClick={() => startGame('EASY')}
            >
              <div style={{ fontWeight: 'bold' }}>ŁATWY</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 'normal' }}>🏆 Rekord: {highscores.EASY}m</div>
            </button>
            
            {/* Poziom Średni */}
            <button 
              style={{ ...buttonStyle, background: '#00ffff', color: '#000' }} 
              onClick={() => startGame('MEDIUM')}
            >
              <div style={{ fontWeight: 'bold' }}>ŚREDNI</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 'normal' }}>🏆 Rekord: {highscores.MEDIUM}m</div>
            </button>
            
            {/* Poziom Trudny */}
            <button 
              style={{ ...buttonStyle, background: '#ff0000', color: '#fff' }} 
              onClick={() => startGame('HARD')}
            >
              <div style={{ fontWeight: 'bold' }}>TRUDNY</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 'normal' }}>🏆 Rekord: {highscores.HARD}m</div>
            </button>

            {/* Przycisk Sklepu */}
            <button 
              style={{ ...buttonStyle, background: '#ffd700', color: '#000', marginTop: '10px', height: '55px' }} 
              onClick={() => { playClick(); setGameState('SHOP'); }}
            >
              <div style={{ fontWeight: 'bold' }}>🛒 SKLEP</div>
            </button>

          </div>
        </div>
      )}

      {/* SKLEP */}
      {gameState === 'SHOP' && (
        <div style={gameOverOverlayStyle}>
          <h1 style={{ fontSize: '2.8rem', color: '#ffd700', marginBottom: '5px' }}>KOSMICZNY SKLEP</h1>
          <div style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '20px', fontWeight: 'bold' }}>
            Twoje monety: <span style={{ color: '#ffd700' }}>🪙 {totalCoins}</span>
          </div>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>Każdy nowy kolor kosztuje <span style={{ color: '#ffd700', fontWeight: 'bold' }}>100 monet</span>. Kliknij, aby kupić lub ustawić jako aktywny.</p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '15px', 
            background: 'rgba(20, 20, 25, 0.85)',
            padding: '25px',
            borderRadius: '16px',
            border: '1px solid #444',
            marginBottom: '25px'
          }}>
            {SHOP_COLORS.map((color, idx) => {
              const isOwned = ownedColors.includes(color)
              const isActive = activeColor === color

              return (
                <div 
                  key={idx}
                  onClick={() => handleColorClick(color)}
                  style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: color,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    position: 'relative',
                    border: isActive ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                    boxShadow: isActive ? `0 0 15px ${color}` : 'none',
                    transition: '0.2s',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)'
                  }}
                  title={isOwned ? (isActive ? 'Aktywny' : 'Posiadasz (Kliknij by wybrać)') : 'Kup za 100 monet'}
                >
                  <div style={{
                    position: 'absolute',
                    bottom: '2px', right: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '1px 1px 2px #000'
                  }}>
                    {isActive ? '🌟' : (isOwned ? '✓' : '🔒')}
                  </div>
                </div>
              )
            })}
          </div>

          <button style={{ ...buttonStyle, background: '#333', color: '#fff', width: '360px', height: '50px' }} onClick={() => { playClick(); setGameState('MENU'); }}>
            POWRÓT DO MENU
          </button>
        </div>
      )}

      {/* Licznik w trakcie gry */}
      {gameState === 'PLAYING' && (
        <div style={ingameHUDStyle}>
          <div style={{ fontSize: '1rem', color: '#00ffff', letterSpacing: '2px', marginBottom: '5px' }}>
            POZIOM: {getLevelName()}
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
            DYSTANS: {score} {level === 'EASY' ? '/ 1000' : level === 'MEDIUM' ? '/ 2000' : ''}
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
            POZIOM {getLevelName()} UKOŃCZONY!
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

          <button style={{ ...buttonStyle, background: '#444', width: '420px', height: '50px' }} onClick={() => { playClick(); setGameState('MENU'); }}>
            WRÓĆ DO MENU
          </button>
        </div>
      )}

      {/* Ekran Przegranej */}
      {gameState === 'GAMEOVER' && (
        <div style={gameOverOverlayStyle}>
          <h1 style={{ fontSize: '3rem', color: 'red', marginBottom: '10px' }}>KONIEC GRY</h1>
          <h3 style={{ color: '#aaa', marginBottom: '15px' }}>Poziom: {getLevelName()}</h3>
          
          <div style={statsBoxStyle}>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💀 Postęp poziomu:</span>
              <span style={{ color: 'red', fontWeight: 'bold' }}>
                {level === 'HARD' ? 'Tryb Bez Końca' : `${Math.floor((score / (level === 'EASY' ? 1000 : 2000)) * 100)}%`}
              </span>
            </p>

            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🏁 Dystans:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>
                {score} {level === 'EASY' ? '/ 1000' : level === 'MEDIUM' ? '/ 2000' : 'metrów'}
              </span>
            </p>

            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🪙 Zebrane monety:</span>
              <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{coinsCollected} szt.</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', width: '420px' }}>
            <button style={{ ...buttonStyle, width: '420px', height: '50px' }} onClick={() => startGame(level)}>
              SPRÓBUJ PONOWNIE
            </button>
            <button style={{ ...buttonStyle, background: '#333', color: '#ccc', fontSize: '1.2rem', width: '420px', height: '50px' }} onClick={() => { playClick(); setGameState('MENU'); }}>
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
  background: 'rgba(0, 0, 0, 0.85)',
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
  fontSize: '1.4rem',
  background: '#ff007f',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  width: '420px',          
  height: '65px',
  textAlign: 'center',
  transition: '0.2s',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
}

const ingameHUDStyle = {
  position: 'absolute',
  top: '20px', left: '20px',
  display: 'flex', flexDirection: 'column',
  zIndex: 5, 
  pointerEvents: 'none', 
  textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.5)'
}