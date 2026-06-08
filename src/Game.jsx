import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars, Grid, Edges } from '@react-three/drei'

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

// MONETA
function CoinMesh({ position }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 4 * delta
    }
  })

  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 3, 0, 0.3]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial 
          color="#ffaa00" 
          transparent={true} 
          opacity={0.25} 
          blending={2} 
        />
      </mesh>

      <mesh 
        ref={meshRef} 
        rotation={[Math.PI / 3, 0, 0.3]} 
      >
        <cylinderGeometry args={[0.4, 0.4, 0.15, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
    </group>
  )
}

export default function Game({ gameState, setGameState, setScore, setCoinsCollected, level, playerColor, isMuted }) {
  const playerRef = useRef()
  const starsRef = useRef() 
  const coinAudio = useRef(null)

  // --- PARAMETRY PROGRESJI PRĘDKOŚCI ---
  let initialSpeed = 16            
  let maxSpeedLimit = 30
  let accelerationRate = 0.2
  let themeColor = '#ff007f' 
  let sectionSpacing = 130   
  let maxRoadLength = 1000

  if (level === 'MEDIUM') {
    initialSpeed = 26              
    maxSpeedLimit = 45
    accelerationRate = 0.3
    themeColor = '#00ffff'   
    sectionSpacing = 95     
    maxRoadLength = 2000        
  } else if (level === 'HARD') {
    initialSpeed = 36              
    maxSpeedLimit = 65
    accelerationRate = 0.4
    themeColor = '#ff0000'   
    sectionSpacing = 70     
    maxRoadLength = Infinity
  }

  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed)

  const [keys, setKeys] = useState({ ArrowLeft: false, ArrowRight: false })
  const [obstacles, setObstacles] = useState([])
  const [coins, setCoins] = useState([]) 
  
  const generatedUntilZ = useRef(-40)

  useEffect(() => {
    coinAudio.current = new Audio('/coin.mp3')
    coinAudio.current.volume = 0.3
  }, [])

  useEffect(() => {
    if (coinAudio.current) {
      coinAudio.current.muted = isMuted
    }
  }, [isMuted])

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

    setObstacles((prev) => [...prev, ...tempObstacles])
    setCoins((prev) => [...prev, ...tempCoins])
  }

  // 1. GENEROWANIE POCZĄTKOWE
  useEffect(() => {
    generatedUntilZ.current = -40
    setObstacles([])
    setCoins([])
    setCurrentSpeed(initialSpeed)

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

    let nextSpeed = currentSpeed + accelerationRate * delta
    if (nextSpeed > maxSpeedLimit) nextSpeed = maxSpeedLimit
    setCurrentSpeed(nextSpeed)

    player.position.z -= nextSpeed * delta

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

    // WYKRYWANIE KOLIZJI + OPTYMALIZACJA (Usuwanie starych wież za plecami gracza)
    setObstacles((prevObstacles) => {
      return prevObstacles.filter((obs) => {
        const diffX = Math.abs(player.position.x - obs[0])
        const diffZ = Math.abs(player.position.z - obs[2])
        if (diffX < 0.9 && diffZ < 1.0) {
          const exactCrashScore = Math.floor(Math.abs(player.position.z))
          setGameState('GAMEOVER', exactCrashScore)
        }
        return obs[2] < player.position.z + 20
      })
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
          
          if (coinAudio.current) {
            coinAudio.current.currentTime = 0
            coinAudio.current.play().catch(() => {})
          }
          return false 
        }
        return coin[2] < player.position.z + 20
      })
    })

    if (level !== 'HARD' && player.position.z < -maxRoadLength) {
      setGameState('WIN', maxRoadLength)
    }
  })

  const currentFloorLength = level === 'HARD' ? 2000 : maxRoadLength
  const currentFloorZ = level === 'HARD' ? playerRef.current?.position.z - 500 || -500 : -maxRoadLength / 2

  return (
    <group>
      <group ref={starsRef}>
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      </group>

      {/* PODŁOGA */}
      <Grid
        position={[0, -0.01, currentFloorZ]}
        args={[10, currentFloorLength]}
        cellSize={1} 
        cellThickness={0.5}
        cellColor="#221133" 
        sectionSize={5} 
        sectionThickness={1}
        sectionColor={themeColor} 
        fadeDistance={60} 
        fadeStrength={1}
        infiniteGrid={false}
      />

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
      <group ref={playerRef} position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={playerColor} 
            emissive={playerColor}
            emissiveIntensity={0.1} 
            transparent={true}
            opacity={0.4} 
            roughness={0.1}
          />
          <Edges
            threshold={15}
            color={playerColor}
            thickness={3.5}
          />
        </mesh>
      </group>

      {/* PRZESZKODY */}
      {obstacles.map((obs, index) => (
        <group key={index} position={obs}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 2, 1.2]} />
            <meshBasicMaterial 
              color="#00ffcc" 
              transparent={true} 
              opacity={0.2} 
              blending={2} 
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.6, 2, 0.6]} />
            <meshBasicMaterial color="#00ffcc" />
          </mesh>
        </group>
      ))}

      {/* MONETY */}
      {coins.map((coin) => (
        <CoinMesh key={coin[3]} position={[coin[0], coin[1], coin[2]]} />
      ))}
    </group>
  )
}