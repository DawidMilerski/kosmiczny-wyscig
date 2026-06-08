import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'

// Prędkość skręcania na boki
const SIDE_SPEED = 15

const SECTIONS = [
  [
    ['o', '.', '.'], 
    ['.', 'c', '.'], 
    ['.', '.', 'o'], 
    ['.', 'c', '.'],
  ],
  [
    ['o', '.', 'o'], 
    ['c', '.', 'c'], 
    ['o', '.', 'o'],
  ],
  [
    ['o', 'o', '.'], 
    ['.', 'c', '.'],
    ['.', 'o', 'o'], 
  ]
]

export default function Game({ gameState, setGameState, setScore, setCoinsCollected, level, playerColor }) {
  const playerRef = useRef()
  const starsRef = useRef() 
  
  // Dynamiczne parametry gry zależne od poziomu trudności (level)
  let speed = 16            
  let themeColor = '#ff007f' 
  let sectionSpacing = 130   
  let maxRoadLength = 1000

  if (level === 'MEDIUM') {
    speed = 26              
    themeColor = '#00ffff'   
    sectionSpacing = 95     
    maxRoadLength = 2000        
  } else if (level === 'HARD') {
    speed = 36              
    themeColor = '#ff0000'   
    sectionSpacing = 70     
    maxRoadLength = Infinity
  }

  const [keys, setKeys] = useState({ ArrowLeft: false, ArrowRight: false })
  const [obstacles, setObstacles] = useState([])
  const [coins, setCoins] = useState([]) 
  
  // Trzymamy w referencji informację, do którego momentu (Z) trasa została już wygenerowana
  const generatedUntilZ = useRef(-40)

  // Funkcja dokładająca kolejną losową sekcję na trasie
  const generateNextSection = (targetZ) => {
    const tempObstacles = []
    const tempCoins = []
    
    const randomSection = SECTIONS[Math.floor(Math.random() * SECTIONS.length)]

    randomSection.forEach((row, rowIndex) => {
      const rowZ = targetZ - rowIndex * 15 
      const xPositions = [-3, 0, 3]

      row.forEach((cell, cellIndex) => {
        const x = xPositions[cellIndex]
        if (cell === 'o') {
          tempObstacles.push([x, 1, rowZ]) 
        } else if (cell === 'c') {
          tempCoins.push([x, 0.5, rowZ, Math.random().toString(), false])
        }
      })
    })

    // Aktualizujemy stany gry, doklejając nowe obiekty do starych
    setObstacles((prev) => [...prev, ...tempObstacles])
    setCoins((prev) => [...prev, ...tempCoins])
  }

  // 1. GENEROWANIE POCZĄTKOWE
  useEffect(() => {
    // Resetujemy punkty generowania przy nowej grze
    generatedUntilZ.current = -40
    setObstacles([])
    setCoins([])

    // Generujemy pierwsze jednosteki drogi
    let startZ = -40
    while (startZ > -400) {
      generateNextSection(startZ)
      startZ -= sectionSpacing
    }
    generatedUntilZ.current = startZ

    if (playerRef.current) {
      playerRef.current.position.set(0, 0.5, 0)
    }
  }, [gameState, sectionSpacing])

  // 2. NASŁUCHIWANIE KLAWIATURY
  useEffect(() => {
    const handleKeyDown = (e) => setKeys((prev) => ({ ...prev, [e.key]: true }))
    const handleKeyUp = (e) => setKeys((prev) => ({ ...prev, [e.key]: false }))

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 3. PĘTLA GRY
  useFrame((state, delta) => {
    if (gameState !== 'PLAYING' || !playerRef.current) return

    const player = playerRef.current

    player.position.z -= speed * delta

    // Jeśli gracz zbliża się do końca wygenerowanej trasy (mniej niż 300m)
    // i nie przekroczył limitu dla poziomów skończonych, 
    // dokleja kolejny segment
    const distanceToTunnelEnd = Math.abs(generatedUntilZ.current) - Math.abs(player.position.z)
    if (distanceToTunnelEnd < 300 && Math.abs(generatedUntilZ.current) < maxRoadLength) {
      generateNextSection(generatedUntilZ.current)
      generatedUntilZ.current -= sectionSpacing
    }

    let targetRotation = 0; 

    if (keys.ArrowLeft && player.position.x > -4.5) {
      player.position.x -= SIDE_SPEED * delta
      targetRotation = 0.35; 
    }
    if (keys.ArrowRight && player.position.x < 4.5) {
      player.position.x += SIDE_SPEED * delta
      targetRotation = -0.35; 
    }

    player.rotation.z += (targetRotation - player.rotation.z) * 0.1

    const currentScore = Math.floor(Math.abs(player.position.z))
    setScore(currentScore)

    state.camera.position.x = player.position.x
    state.camera.position.z = player.position.z + 8 
    state.camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 5)

    if (starsRef.current) {
      starsRef.current.position.z = player.position.z
    }

    // WYKRYWANIE KOLIZJI
    obstacles.forEach((obs) => {
      const diffX = Math.abs(player.position.x - obs[0])
      const diffZ = Math.abs(player.position.z - obs[2])
      if (diffX < 0.9 && diffZ < 1.0) {
        const exactCrashScore = Math.floor(Math.abs(player.position.z))
        setGameState('GAMEOVER', exactCrashScore)
      }
    })

    // WYKRYWANIE MONET
    setCoins((prevCoins) => {
      return prevCoins.filter((coin) => {
        if (coin[4] === true) return false
        const diffX = Math.abs(player.position.x - coin[0])
        const diffZ = Math.abs(player.position.z - coin[2])
        if (diffX < 1.0 && diffZ < 1.0) {
          coin[4] = true 
          setCoinsCollected((prev) => prev + 1) 
          return false 
        }
        return true 
      })
    })

    // WARUNEK WYGRANEJ
    if (level !== 'HARD' && player.position.z < -maxRoadLength) {
      setGameState('WIN', maxRoadLength)
    }
  })

  // Dla trybu nieskończonego podłoga rysuje się w nieskończoność wokół gracza
  const currentFloorLength = level === 'HARD' ? 2000 : maxRoadLength
  const currentFloorZ = level === 'HARD' ? playerRef.current?.position.z - 500 || -500 : -maxRoadLength / 2

  return (
    <group>
      <group ref={starsRef}>
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, currentFloorZ]}>
        <planeGeometry args={[10, currentFloorLength]} />
        <meshStandardMaterial color="#111115" roughness={0.8} />
      </mesh>

      {/* LINIE BOCZNE */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0.01, currentFloorZ]}>
        <planeGeometry args={[0.1, currentFloorLength]} />
        <meshStandardMaterial color={themeColor} emissive={themeColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.01, currentFloorZ]}>
        <planeGeometry args={[0.1, currentFloorLength]} />
        <meshStandardMaterial color={themeColor} emissive={themeColor} />
      </mesh>

      {/* GRACZ */}
      <mesh ref={playerRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={playerColor} roughness={0.2} metalness={0.5} />
      </mesh>

      {/* PRZESZKODY */}
      {obstacles.map((obs, index) => (
        <mesh key={index} position={obs}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#00ffff" emissive="#003333" roughness={0.5} />
        </mesh>
      ))}

      {/* MONETY */}
      {coins.map((coin) => (
        <mesh key={coin[3]} position={[coin[0], coin[1], coin[2]]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#ffd700" emissive="#332200" roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}