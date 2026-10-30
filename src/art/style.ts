/** Global visual parameters. Change here before changing individual scene code. */
export const art = {
  sky: '#dcebf2', skyZenith: '#90bbda', skyHorizon: '#f0efdc', fog: '#e8efdf', lightAmbient: 1.45, lightSun: 2.55,
  meadow: '#bcd09a', grassLight: '#d7dfa6', grassDark: '#93b889',
  warmPath: '#e7d3af', timber: '#ae815b', woodPale: '#e8c9a0',
  roof: '#bd7b68', leaf: ['#77a88a','#95b68b','#b8bc78','#d7ae77'],
  cream: '#fff2d9', mutedBlue: '#8db9c4', coral: '#e09b8e',
  wall: '#f4dfc0', floor: '#d5aa76', ink: '#48515c',
  shadowOpacity: 0.24, exposure: 1.03,
  animation: { walkSpeed: 2.7, runSpeed: 4.75, turnDamping: 9, approachDistance: 0.75, cameraDamping: 3.8 },
} as const;
