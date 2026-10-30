/** Global visual parameters. Change here before changing individual scene code. */
export const art = {
  sky: '#eaf3e7', fog: '#eaf3e7',
  meadow: '#bcd09a', grassLight: '#d7dfa6', grassDark: '#93b889',
  warmPath: '#e7d3af', timber: '#ae815b', woodPale: '#e8c9a0',
  roof: '#bd7b68', leaf: ['#80b38b','#a6c493','#d0ce85','#e3ba7e'],
  cream: '#fff2d9', mutedBlue: '#8db9c4', coral: '#e09b8e',
  wall: '#f4dfc0', floor: '#d5aa76', ink: '#48515c',
  shadowOpacity: 0.2, exposure: 1.25,
  animation: { walkSpeed: 2.7, runSpeed: 4.75, turnDamping: 9, approachDistance: 0.75, cameraDamping: 3.8 },
} as const;
