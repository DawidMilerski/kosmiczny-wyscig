// src/Game.jsx
import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars, Sparkles } from '@react-three/drei'
//  Dodaliśmy import tutaj

// Stałe parametry gry
const SPEED = 20          // Prędkość poruszania się do przodu
const SIDE_SPEED = 15     // Prędkość skręcania na boki
const ROAD_LENGTH = 1000  // Długość trasy

// Definicje gotowych sekcji drogi
// 'o' = przeszkoda (słup), 'c' = moneta (coin), '.' = puste miejsce
// Każdy wiersz to kolejny krok w głąb ekranu, a kolumny to lewa, środek, prawa strona drogi
const SECTIONS = [
  // Sekcja 1: Slalom (wymusza ruch lewo-prawo)
  [
    ['o', '.', '.'], // przeszkoda po lewej
    ['.', 'c', '.'], // moneta na środku
    ['.', '.', 'o'], // przeszkoda po prawej
    ['.', 'c', '.'],
  ],
  // Sekcja 2: Bramka i ryzyko
  [
    ['o', '.', 'o'], // zablokowane boki, środek wolny
    ['c', '.', 'c'], // monety na bokach (ryzyko!)
    ['o', '.', 'o'],
  ],
  // Sekcja 3: Ściana (wymusza ucieczkę na jedną krawędź)
  [
    ['o', 'o', '.'], // wolna tylko prawa strona
    ['.', 'c', '.'],
    ['.', 'o', 'o'], // wolna tylko lewa strona
  ]
]

export default function Game({ gameState, setGameState, setScore, setCoinsCollected }) {
// export default function Game({ gameState, setGameState, setScore }) {
  const playerRef = useRef()
  const starsRef = useRef() // <-- Referencja do gwiazd, żeby nimi poruszać
  
  // Stan klawiatury
  const [keys, setKeys] = useState({ ArrowLeft: false, ArrowRight: false })

  // Stan przechowujący przeszkody ORAZ monety
  const [obstacles, setObstacles] = useState([])
  const [coins, setCoins] = useState([]) // <-- NOWOŚĆ: Stan na monety

  // 1. GENEROWANIE POZIOMU Z GOTOWYCH SEKCJI
  useEffect(() => {
    const tempObstacles = []
    const tempCoins = []

    // Budujemy trasę segment po segmencie co 80 jednostek w osi Z
    // Zaczynamy od -40, żeby gracz miał chwilę na start
    let currentZ = -40 

    while (currentZ > -ROAD_LENGTH + 100) {
      // Losujemy jedną z trzech zdefiniowanych sekcji
      const randomSection = SECTIONS[Math.floor(Math.random() * SECTIONS.length)]

      // Przetwarzamy wiersze wylosowanej sekcji
      randomSection.forEach((row, rowIndex) => {
        const rowZ = currentZ - rowIndex * 15 // Kolejne rzędy oddalone o 15 jednostek

        // Sprawdzamy 3 pozycje: Lewa (X=-3), Środek (X=0), Prawa (X=3)
        const xPositions = [-3, 0, 3]

        row.forEach((cell, cellIndex) => {
          const x = xPositions[cellIndex]

          if (cell === 'o') {
            tempObstacles.push([x, 1, rowZ]) // Dodaj słup
          } else if (cell === 'c') {
            // Dodajemy: [X, Y, Z, ID, czy_zebrana]
            tempCoins.push([x, 0.5, rowZ, Math.random().toString(), false])
          }
        })
      })

      currentZ -= 120 // Przesuwamy punkt startowy dla kolejnej sekcji
    }

    setObstacles(tempObstacles)
    setCoins(tempCoins)

    if (playerRef.current) {
      playerRef.current.position.set(0, 0.5, 0)
    }
  }, [gameState])

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

  // 3. PĘTLA GRY (Wykonuje się co klatkę animacji, ok. 60 razy na sekundę)
  useFrame((state, delta) => {
    // Jeśli nie gramy, zatrzymaj fizykę gry
    if (gameState !== 'PLAYING' || !playerRef.current) return

    const player = playerRef.current

    // Automatyczny ruch do przodu (w osi Z ujemnej)
    player.position.z -= SPEED * delta

    // RUCH NA BOKI + DYNAMICZNY OBRÓT (ROTACJA)
    let targetRotation = 0; // Domyślnie prosto

    if (keys.ArrowLeft && player.position.x > -4.5) {
      player.position.x -= SIDE_SPEED * delta
      targetRotation = 0.35; // Pochylenie w lewo (w radianach)
    }
    if (keys.ArrowRight && player.position.x < 4.5) {
      player.position.x += SIDE_SPEED * delta
      targetRotation = -0.35; // Pochylenie w prawo
    }

    // Płynne interpolowanie (lerp) rotacji, żeby kostka nie skakała sztywno
    player.rotation.z += (targetRotation - player.rotation.z) * 0.1

    // Aktualizacja wyniku na podstawie przejechanego dystansu
    const currentScore = Math.floor(Math.abs(player.position.z))
    setScore(currentScore)

    // Kamera płynnie podąża za graczem
    state.camera.position.x = player.position.x
    state.camera.position.z = player.position.z + 8 // 8 jednostek za graczem
    state.camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 5)

    // NOCNA NAPRAWA: Przesuwamy chmurę gwiazd dokładnie tam, gdzie jest gracz
    if (starsRef.current) {
      starsRef.current.position.z = player.position.z
    }

    // WYKRYWANIE KOLIZJI
    obstacles.forEach((obs) => {
      const obsX = obs[0]
      const obsZ = obs[2]

      // Obliczamy odległość w osi X i Z między graczem a przeszkodą
      const diffX = Math.abs(player.position.x - obsX)
      const diffZ = Math.abs(player.position.z - obsZ)

      // Jeśli gracz jest zbyt blisko przeszkody (wymiary sześcianów to ok 1x1)
      if (diffX < 0.9 && diffZ < 1.0) {
        setGameState('GAMEOVER')
      }
    })

    // WYKRYWANIE ZBIERANIA MONET
    setCoins((prevCoins) => {
      return prevCoins.filter((coin) => {
        // Jeśli moneta została już oznaczona jako zebrana w poprzedniej klatce, usuń ją/pomiń
        if (coin[4] === true) return false

        const coinX = coin[0]
        const coinZ = coin[2]

        const diffX = Math.abs(player.position.x - coinX)
        const diffZ = Math.abs(player.position.z - coinZ)

        if (diffX < 1.0 && diffZ < 1.0) {
          // NATYCHMIASTOWA BLOKADA: Oznaczamy monetę w pamięci jako zebraną, 
          // dzięki czemu kolejna klatka useFrame już tu nie wejdzie
          coin[4] = true 

          // Zwiększamy licznik w App.jsx o DOKŁADNIE JEDNĄ sztukę
          setCoinsCollected((prev) => prev + 1) 
          
          return false 
        }
        return true 
      })
    })

    // Sprawdzenie czy gracz dojechał do końca trasy
    if (player.position.z < -ROAD_LENGTH) {
      setGameState('WIN')
    }
  })

  return (
    <group>
      {/* GWIAZDY: Przypięte za pomocą referencji starsRef, domyślnie wyśrodkowane na graczu */}
      <group ref={starsRef}>
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      </group>

      {/* PODŁOGA (Długa, ciemnoszara ścieżka) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[10, ROAD_LENGTH]} />
        <meshStandardMaterial color="#111115" roughness={0.8} />
      </mesh>

      {/* LINIE BOCZNE */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0.01, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.1, ROAD_LENGTH]} />
        <meshStandardMaterial color="#ff007f" emissive="#ff007f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.01, -ROAD_LENGTH / 2]}>
        <planeGeometry args={[0.1, ROAD_LENGTH]} />
        <meshStandardMaterial color="#ff007f" emissive="#ff007f" />
      </mesh>

      {/* GRACZ (Różowa kostka 3D) */}
      <mesh ref={playerRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff007f" roughness={0.2} metalness={0.5} />
      </mesh>

      {/* PRZESZKODY */}
      {obstacles.map((obs, index) => (
        <mesh key={index} position={obs}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#00ffff" emissive="#003333" roughness={0.5} />
        </mesh>
      ))}

      {/* MONETY (Żółte świecące kulki) */}
      {coins.map((coin) => (
        <mesh key={coin[3]} position={[coin[0], coin[1], coin[2]]}>
          {/* SphereGeometry tworzy kulę: args=[promień, jakość_poziom, jakość_pion] */}
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#ffd700" emissive="#332200" roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}