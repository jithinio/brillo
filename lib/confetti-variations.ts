import confetti from 'canvas-confetti'

// Random utility function
function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

// Success confetti for converting projects to active
export const successConfetti = () => {
  const duration = 3000 // 3 seconds
  const animationEnd = Date.now() + duration
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 9999,
    colors: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7', '#a7f3d0']
  }

  // First burst from center
  confetti({
    ...defaults,
    particleCount: 150,
    spread: 60,
    origin: { x: 0.5, y: 0.6 },
    shapes: ['circle', 'square'],
    scalar: 1.4,
  })

  // Left side burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      spread: 80,
      origin: { x: 0.2, y: 0.7 },
      drift: 1,
      gravity: 0.8,
      shapes: ['star', 'circle'],
      scalar: 1.2,
    })
  }, 200)

  // Right side burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      spread: 80,
      origin: { x: 0.8, y: 0.7 },
      drift: -1,
      gravity: 0.8,
      shapes: ['star', 'circle'],
      scalar: 1.2,
    })
  }, 400)

  // Continuous small bursts
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    
    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const particleCount = 50 * (timeLeft / duration)
    
    // Random positions across the screen
    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount),
      spread: randomInRange(50, 100),
      origin: { 
        x: randomInRange(0.1, 0.9), 
        y: randomInRange(0.4, 0.8) 
      },
      drift: randomInRange(-2, 2),
      gravity: randomInRange(0.6, 1.2),
      shapes: ['circle', 'square', 'star'],
      scalar: randomInRange(0.8, 1.6),
    })
  }, 250)

  // Final big burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 200,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      shapes: ['star', 'circle', 'square'],
      scalar: 1.8,
      gravity: 0.9,
      drift: 0,
    })
  }, 1000)
}

// Fireworks style confetti for major achievements
export const fireworksConfetti = () => {
  const duration = 4000
  const animationEnd = Date.now() + duration

  // Multiple firework bursts
  const colors = [
    ['#ff0000', '#ff4444', '#ff8888'],
    ['#00ff00', '#44ff44', '#88ff88'],
    ['#0000ff', '#4444ff', '#8888ff'],
    ['#ffff00', '#ffff44', '#ffff88'],
    ['#ff00ff', '#ff44ff', '#ff88ff'],
    ['#00ffff', '#44ffff', '#88ffff']
  ]

  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const colorSet = colors[Math.floor(Math.random() * colors.length)]
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { 
          x: randomInRange(0.2, 0.8), 
          y: randomInRange(0.3, 0.7) 
        },
        colors: colorSet,
        shapes: ['star', 'circle'],
        scalar: randomInRange(1.2, 2.0),
        gravity: 0.6,
        drift: randomInRange(-1, 1),
        ticks: 120,
        startVelocity: 45,
      })
    }, i * 500)
  }
}

// Rain of money/success confetti
export const moneyRainConfetti = () => {
  const duration = 2500
  const colors = ['#FFD700', '#FFA500', '#32CD32', '#00CED1', '#9370DB']
  
  // Create falling "money" effect
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 30,
        origin: { x: randomInRange(0, 1), y: 0 },
        colors: colors,
        shapes: ['square'],
        scalar: 1.5,
        gravity: 1.2,
        drift: randomInRange(-0.5, 0.5),
        ticks: 100,
        startVelocity: 20,
      })
    }, i * 150)
  }
}

// Cannon blast confetti
export const cannonConfetti = () => {
  // Left cannon
  confetti({
    particleCount: 100,
    spread: 60,
    origin: { x: 0, y: 0.6 },
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    shapes: ['circle', 'square', 'star'],
    scalar: 1.3,
    angle: 60,
    startVelocity: 55,
    gravity: 0.8,
    drift: 1,
  })

  // Right cannon
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { x: 1, y: 0.6 },
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
      shapes: ['circle', 'square', 'star'],
      scalar: 1.3,
      angle: 120,
      startVelocity: 55,
      gravity: 0.8,
      drift: -1,
    })
  }, 300)
}

// Heart explosion for special moments
export const heartConfetti = () => {
  const heartShape = confetti.shapeFromText({ text: '❤️', scalar: 2 })
  const starShape = confetti.shapeFromText({ text: '⭐', scalar: 2 })
  
  // Center burst
  confetti({
    particleCount: 50,
    spread: 80,
    origin: { x: 0.5, y: 0.6 },
    colors: ['#ff69b4', '#ff1493', '#ffc0cb', '#ffb6c1'],
    shapes: [heartShape, starShape, 'circle'],
    scalar: 1.5,
    gravity: 0.7,
    ticks: 150,
  })

  // Follow-up smaller bursts
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { 
            x: randomInRange(0.3, 0.7), 
            y: randomInRange(0.5, 0.7) 
          },
          colors: ['#ff69b4', '#ff1493', '#ffc0cb'],
          shapes: [heartShape, 'circle'],
          scalar: 1.2,
          gravity: 0.8,
        })
      }, i * 400)
    }
  }, 500)
}

// School pride confetti (traditional)
export const schoolPrideConfetti = () => {
  // Traditional colors
  const colors = ['#001f3f', '#FF851B', '#FFDC00', '#2ECC40', '#B10DC9', '#FF4136']
  
  // Side cannons
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { x: 0.1, y: 0.7 },
    colors: colors,
    shapes: ['circle', 'square'],
    scalar: 1.4,
    angle: 60,
    startVelocity: 45,
  })

  confetti({
    particleCount: 120,
    spread: 70,
    origin: { x: 0.9, y: 0.7 },
    colors: colors,
    shapes: ['circle', 'square'],
    scalar: 1.4,
    angle: 120,
    startVelocity: 45,
  })

  // Center celebration
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { x: 0.5, y: 0.5 },
      colors: colors,
      shapes: ['star', 'circle', 'square'],
      scalar: 1.6,
      gravity: 0.9,
    })
  }, 600)
}

// Special project conversion celebration
export const projectConversionConfetti = () => {
  const duration = 3500
  const businessColors = ['#10b981', '#059669', '#047857', '#34d399', '#6ee7b7', '#FFD700', '#FFA500', '#32CD32']
  
  // Create business/success themed shapes
  const dollarShape = confetti.shapeFromText({ text: '💰', scalar: 3 })
  const chartShape = confetti.shapeFromText({ text: '📈', scalar: 3 })
  const checkShape = confetti.shapeFromText({ text: '✅', scalar: 3 })
  const trophyShape = confetti.shapeFromText({ text: '🏆', scalar: 3 })
  
  // Initial celebration burst with business icons
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 0.6 },
    colors: businessColors,
    shapes: [dollarShape, chartShape, checkShape, 'star', 'circle'],
    scalar: 1.5,
    gravity: 0.8,
    ticks: 100,
    startVelocity: 40,
  })

  // Money rain effect
  setTimeout(() => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 20,
          spread: 25,
          origin: { x: randomInRange(0.2, 0.8), y: 0.1 },
          colors: ['#FFD700', '#FFA500', '#32CD32'],
          shapes: [dollarShape, 'square'],
          scalar: 1.3,
          gravity: 1.1,
          drift: randomInRange(-0.3, 0.3),
          startVelocity: 15,
        })
      }, i * 200)
    }
  }, 500)

  // Trophy burst from center
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FFD700', '#FFA500', '#FF6B6B'],
      shapes: [trophyShape, chartShape, 'star'],
      scalar: 2.0,
      gravity: 0.7,
      ticks: 150,
    })
  }, 1200)

  // Final success wave
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.5, y: 0.7 },
      colors: businessColors,
      shapes: ['circle', 'square', 'star'],
      scalar: 1.4,
      gravity: 0.9,
      angle: 90,
      startVelocity: 35,
    })
  }, 2000)

  // Side celebrations
  setTimeout(() => {
    // Left side
    confetti({
      particleCount: 50,
      spread: 55,
      origin: { x: 0.1, y: 0.8 },
      colors: businessColors,
      shapes: [checkShape, 'circle'],
      scalar: 1.2,
      angle: 45,
      startVelocity: 30,
    })
    
    // Right side
    confetti({
      particleCount: 50,
      spread: 55,
      origin: { x: 0.9, y: 0.8 },
      colors: businessColors,
      shapes: [checkShape, 'circle'],
      scalar: 1.2,
      angle: 135,
      startVelocity: 30,
    })
  }, 2500)
} 