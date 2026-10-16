// KAP glyphs — the one illustration set used everywhere instead of system emoji.
// Rules that keep the set consistent:
//   • 64×64 grid, objects sit on y≈56, light comes from the top (every fill is a top→bottom gradient)
//   • only the tones in PAL below, so a burger, a car and a pill all belong to the same family
//   • a soft white highlight on the upper-left of the main form, no outlines
// Fills are written as "@key" and resolved to per-instance gradients, so one page can show
// the same glyph many times without id clashes.

export const PAL: Record<string, [string, string]> = {
  y: ['#FFE56B', '#FFC000'], // KAP yellow
  k: ['#5C5C6A', '#1E1E24'], // ink
  w: ['#FFFFFF', '#DCE0E7'], // white / porcelain
  c: ['#FFF6DE', '#EED39A'], // cream / dough
  r: ['#FF8468', '#DC3A2B'], // red
  g: ['#7EE09C', '#2A9D55'], // green
  m: ['#A9653A', '#5C3017'], // meat / chocolate
  f: ['#FFC96E', '#D9821E'], // fried / baked gold
  o: ['#FFB24A', '#F06A12'], // orange
  u: ['#86C8FF', '#2C72DC'], // blue
  a: ['#D8EEFF', '#86BFF0'], // water / glass
  p: ['#FFA8C8', '#E3457D'], // pink
  s: ['#BCC5D2', '#66717F'], // steel
  t: ['#6FE6CF', '#11A386'], // teal (health)
  b: ['#EDBB82', '#B87838'], // cardboard / tea-brown
};

const HL = 'fill="#fff" opacity=".42"';
const SH = 'fill="#000" opacity=".13"';

// ---- vehicles (side view faces right, like a map arrow) -------------------------------------
const sedan = (col: string) => `
<circle cx="17" cy="46" r="6.6" fill="@k"/><circle cx="47" cy="46" r="6.6" fill="@k"/>
<path d="M5 41.5Q5 35.5 11 34.6L20 33.2 26 25.6Q28.4 22.6 32.4 22.6H42Q46 22.6 48.4 25.6L54 32.6Q59.5 33.6 59.5 39V43Q59.5 46 56.5 46H8Q5 46 5 43Z" fill="${col}"/>
<path d="M23.2 33 28 26.8Q29.4 25.2 31.4 25.2H36.4V33Z M39.2 25.2H42Q44.4 25.2 46 27.2L50.6 33H39.2Z" fill="@a"/>
<path d="M9 36.4H55" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
<rect x="54.6" y="37" width="4.4" height="3.4" rx="1.6" fill="@y"/><rect x="5.4" y="37.2" width="3.4" height="3" rx="1.4" fill="@r"/>
<circle cx="17" cy="46" r="2.8" fill="@s"/><circle cx="47" cy="46" r="2.8" fill="@s"/>`;

const badge = `<circle cx="47" cy="47" r="11" fill="@k"/><circle cx="47" cy="47" r="8.6" fill="@y"/>
<path d="M43 51 48.6 45.4" stroke="#1A1A20" stroke-width="2.8" stroke-linecap="round"/>
<path d="M48.2 41.6A3.6 3.6 0 1 0 52 46.4L50.4 44.8 49.6 43.6Z" fill="#1A1A20"/>`;

const house = `
<rect x="13" y="29" width="38" height="26" rx="3" fill="@c"/>
<path d="M13 29H51V33H13Z" ${SH}/>
<path d="M5.6 31 30 11.2Q32 9.6 34 11.2L58.4 31Q59.6 33.4 57 33.6H7Q4.4 33.4 5.6 31Z" fill="@r"/>
<path d="M14 26.6 30 13.6Q32 12 34 13.6L37 16" stroke="#fff" stroke-opacity=".25" stroke-width="1.6" stroke-linecap="round" fill="none"/>
<rect x="27" y="39" width="10" height="16" rx="2" fill="@y"/><circle cx="34.6" cy="47.6" r="1" fill="#1A1A20"/>
<rect x="17" y="37.5" width="7" height="7" rx="1.6" fill="@a"/><rect x="40" y="37.5" width="7" height="7" rx="1.6" fill="@a"/>`;

export const GLYPHS: Record<string, string> = {
  // ---------------------------------------------------------------- services
  taxi: `
<rect x="10" y="45" width="9" height="11" rx="3" fill="@k"/><rect x="45" y="45" width="9" height="11" rx="3" fill="@k"/>
<path d="M16.6 30 21.6 17.4Q23 13.6 27.4 13.6H36.6Q41 13.6 42.4 17.4L47.4 30Z" fill="@y"/>
<path d="M20.8 29.4 24.8 19.4Q25.6 17.4 28 17.4H36Q38.4 17.4 39.2 19.4L43.2 29.4Z" fill="@k"/>
<path d="M27.6 18.6H31.6L27.2 29.4H23.2Z" fill="#fff" opacity=".22"/>
<rect x="24.6" y="7.4" width="14.8" height="6.6" rx="2.2" fill="@k"/>
<text x="32" y="12.6" text-anchor="middle" font-size="4.6" font-weight="700" fill="#FFD100" font-family="Readex Pro,Arial,sans-serif">KAP</text>
<ellipse cx="9.4" cy="30.4" rx="3.6" ry="2.4" fill="@f"/><ellipse cx="54.6" cy="30.4" rx="3.6" ry="2.4" fill="@f"/>
<rect x="6" y="28" width="52" height="21" rx="8" fill="@y"/>
<path d="M12 30H52Q55.4 30 56.4 33.2Q44 31.6 32 31.6T7.6 33.2Q8.6 30 12 30Z" ${HL}/>
<rect x="10" y="35" width="11" height="5.6" rx="2.8" fill="@w"/><rect x="43" y="35" width="11" height="5.6" rx="2.8" fill="@w"/>
<rect x="24" y="37" width="16" height="4.6" rx="2.3" fill="@k"/>
<rect x="8" y="45" width="48" height="5.4" rx="2.7" fill="@k"/><rect x="27" y="46.2" width="10" height="3" rx="1" fill="#F4F4F4"/>`,

  scooter: `
<circle cx="15" cy="47" r="7.4" fill="@k"/><circle cx="49" cy="47" r="7.4" fill="@k"/>
<circle cx="15" cy="47" r="3" fill="@s"/><circle cx="49" cy="47" r="3" fill="@s"/>
<path d="M44.6 31.6 50 12.8H54L49.4 31.6Z" fill="@k"/><rect x="47.4" y="10" width="11" height="3.8" rx="1.9" fill="@k"/>
<path d="M9 44Q9 36 17.6 35H31L34 41.4H43.6L46 32.4Q47 28.8 50.8 28.8H52.4L55.6 43.6Q56 46 53.6 46H11Q9 46 9 44Z" fill="@y"/>
<path d="M17.6 35H31L32 37.4H14Q15 35.2 17.6 35Z" ${HL}/>
<rect x="18" y="30" width="16" height="5.4" rx="2.7" fill="@k"/>
<rect x="5" y="11.6" width="21" height="19" rx="3.4" fill="@y"/><rect x="5" y="11.6" width="21" height="19" rx="3.4" ${SH}/>
<path d="M5 15Q5 11.6 8.4 11.6H22.6Q26 11.6 26 15V16.6H5Z" fill="@y"/>
<rect x="5" y="18.4" width="21" height="3.8" fill="@k"/>
<text x="15.5" y="21.4" text-anchor="middle" font-size="3.4" font-weight="700" fill="#FFD100" font-family="Readex Pro,Arial,sans-serif">KAP</text>
<circle cx="55.2" cy="22" r="2.4" fill="@w"/>`,

  burger: `
<path d="M11 44H53Q53 51.6 45.4 51.6H18.6Q11 51.6 11 44Z" fill="@f"/>
<rect x="9.6" y="36.6" width="44.8" height="8" rx="4" fill="@m"/>
<path d="M10.6 35H53.4L50.4 40.8 46.4 37 41.6 41.6 36.8 37 32 41.6 27.2 37 22.4 41.6 17.6 37 13.6 40.8Z" fill="@y"/>
<path d="M8.6 34.6Q12.6 31 16.6 34Q20.6 31 24.6 34Q28.6 31 32.6 34Q36.6 31 40.6 34Q44.6 31 48.6 34Q52.6 31 55.6 34.6L55 36.4H9.2Z" fill="@g"/>
<path d="M10 31Q10 13.6 32 13.6T54 31Q54 33 52 33H12Q10 33 10 31Z" fill="@f"/>
<path d="M16 25Q18.6 17.6 28 16.4Q22 19.4 19.6 25.6Q17.6 27.6 16 25Z" ${HL}/>
<g fill="#FFF3D6"><ellipse cx="26" cy="20.6" rx="1.7" ry="1" transform="rotate(-20 26 20.6)"/><ellipse cx="34" cy="18.6" rx="1.7" ry="1"/><ellipse cx="41" cy="22" rx="1.7" ry="1" transform="rotate(20 41 22)"/><ellipse cx="30.6" cy="25" rx="1.7" ry="1"/><ellipse cx="45.6" cy="27" rx="1.6" ry=".9" transform="rotate(30 45.6 27)"/></g>`,

  bag: `
<path d="M23.6 22V17Q23.6 9.6 32 9.6T40.4 17V22" stroke="@k" stroke-width="3.6" stroke-linecap="round" fill="none"/>
<path d="M14 22.4Q14.2 19 17.4 19H46.6Q49.8 19 50 22.4L53 52Q53.4 56 49.4 56H14.6Q10.6 56 11 52Z" fill="@y"/>
<path d="M44.6 19H46.6Q49.8 19 50 22.4L53 52Q53.4 56 49.4 56H46.6Z" ${SH}/>
<path d="M17.4 23H21.4L19.4 51H15.4Z" ${HL}/>
<circle cx="23.6" cy="25" r="1.8" fill="@k"/><circle cx="40.4" cy="25" r="1.8" fill="@k"/>
<rect x="22" y="36" width="20" height="9" rx="4.5" fill="@k"/>
<text x="32" y="42.4" text-anchor="middle" font-size="5.4" font-weight="700" fill="#FFD100" font-family="Readex Pro,Arial,sans-serif">KAP</text>`,

  pharmacy: `
<path d="M25 18.4V14.6Q25 11 28.6 11H35.4Q39 11 39 14.6V18.4" stroke="@k" stroke-width="3.2" fill="none"/>
<rect x="8" y="18" width="46" height="36" rx="7" fill="@w"/>
<path d="M8 25V25Q8 18 15 18H47Q54 18 54 25Z" fill="@t"/>
<path d="M13 28H17L16 49H12.4Z" ${HL}/>
<path d="M27.6 30H34.4V36.6H41V43.4H34.4V50H27.6V43.4H21V36.6H27.6Z" fill="@t"/>
<g transform="rotate(-38 48 47)"><rect x="38" y="42" width="20" height="10" rx="5" fill="@w"/><path d="M48 42H43Q38 42 38 47T43 52H48Z" fill="@r"/><rect x="40.6" y="43.4" width="6" height="2" rx="1" fill="#fff" opacity=".5"/></g>`,

  gift: `
<rect x="11" y="30" width="42" height="25" rx="4" fill="@y"/>
<path d="M40 30H49Q53 30 53 34V51Q53 55 49 55H40Z" ${SH}/>
<rect x="8" y="22" width="48" height="10" rx="3.6" fill="@y"/>
<path d="M11 24.6H53" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
<rect x="28" y="22" width="8" height="33" fill="@r"/>
<path d="M32 22.4Q21 7 15.4 13.6Q11.6 18.6 20 22.4Z M32 22.4Q43 7 48.6 13.6Q52.4 18.6 44 22.4Z" fill="@r"/>
<path d="M30 21.4Q22 13 18 15Q20 15 30 21.4Z M34 21.4Q42 13 46 15Q44 15 34 21.4Z" ${HL}/>
<circle cx="32" cy="21.6" r="3.6" fill="@r"/>`,

  homefix: `${house}${badge}`,
  carfix: `${sedan('@u')}<g transform="translate(-6 -4)">${badge}</g>`,
  house,

  // ---------------------------------------------------------------- vehicles
  sedan: sedan('@y'),
  suv: `
<circle cx="17" cy="46.4" r="6.8" fill="@k"/><circle cx="47" cy="46.4" r="6.8" fill="@k"/>
<rect x="21.6" y="17.4" width="24" height="2.4" rx="1.2" fill="@k"/>
<path d="M5 42Q5 36 10 35L16 34 19.6 22.4Q20.6 19.8 23.6 19.8H45Q48 19.8 49.8 22.4L55 33Q59.5 34 59.5 39V43.4Q59.5 46.4 56.5 46.4H8Q5 46.4 5 43.4Z" fill="@s"/>
<path d="M20.4 33 23.6 23.6H34V33Z M37 23.6H45Q46.6 23.6 47.6 25.2L51.4 33H37Z" fill="@a"/>
<path d="M9 37H55" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
<rect x="54.6" y="37.6" width="4.4" height="3.4" rx="1.6" fill="@y"/>
<circle cx="17" cy="46.4" r="2.8" fill="@s"/><circle cx="47" cy="46.4" r="2.8" fill="@s"/>`,
  van: `
<circle cx="16" cy="47" r="6.6" fill="@k"/><circle cx="47" cy="47" r="6.6" fill="@k"/>
<path d="M5 43.6V24Q5 18 11 18H44Q48.6 18 51.6 21.8L58.4 30.6Q59.5 32.2 59.5 34.6V44Q59.5 47 56.5 47H8.4Q5 47 5 43.6Z" fill="@w"/>
<path d="M5 37H59.5V40H5Z" fill="@y"/>
<rect x="9" y="22" width="11" height="9" rx="2" fill="@a"/><rect x="23" y="22" width="11" height="9" rx="2" fill="@a"/>
<path d="M37 22H44Q46.4 22 47.8 24L53.4 31H37Z" fill="@a"/>
<path d="M35.4 21V46" stroke="#000" stroke-opacity=".12" stroke-width="1.2"/>
<rect x="55" y="36.6" width="4" height="3" rx="1.4" fill="@o"/>
<circle cx="16" cy="47" r="2.7" fill="@s"/><circle cx="47" cy="47" r="2.7" fill="@s"/>`,
  bicycle: `
<circle cx="15" cy="42" r="10.6" stroke="@s" stroke-width="3.6" fill="none"/><circle cx="49" cy="42" r="10.6" stroke="@s" stroke-width="3.6" fill="none"/>
<path d="M15 42 25 24H44L49 42M25 24 33 42H15M44 24 33 42M41 15.6 44 24" stroke="@y" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
<rect x="19.6" y="19.6" width="11" height="3.6" rx="1.8" fill="@k"/><rect x="38" y="13" width="9" height="3.4" rx="1.7" fill="@k"/>
<circle cx="33" cy="42" r="3" fill="@k"/>`,

  // ---------------------------------------------------------------- food
  skewer: `
<path d="M10 56 56 10" stroke="@b" stroke-width="2.6" stroke-linecap="round"/>
<g transform="rotate(-45 32 32)">
<rect x="9" y="25.4" width="10" height="13.2" rx="3.6" fill="@m"/>
<circle cx="25.6" cy="32" r="6" fill="@r"/>
<rect x="32" y="25" width="10.6" height="14" rx="3.8" fill="@m"/>
<rect x="46" y="25.8" width="8" height="12.4" rx="3" fill="@g"/>
<path d="M11 27.6H16" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/><path d="M34 27.4H40" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>
</g>`,
  drumstick: `
<path d="M24 41 14 51" stroke="#CDB991" stroke-width="6.6" stroke-linecap="round"/>
<path d="M24 41 14 51" stroke="#F7EEDC" stroke-width="3.6" stroke-linecap="round"/>
<circle cx="9.6" cy="49.4" r="4.8" fill="#CDB991"/><circle cx="15.6" cy="55.4" r="4.8" fill="#CDB991"/><circle cx="9.6" cy="49.4" r="3.4" fill="#F2E7D1"/><circle cx="15.6" cy="55.4" r="3.4" fill="#F2E7D1"/>
<circle cx="9" cy="48.6" r="2.2" fill="#fff" opacity=".7"/>
<path d="M30 9.6Q47 5.6 53.4 18.4Q59 31 46 40.6 38 46.4 28.6 47.6 22.4 48.2 20.6 44 18.6 40 22 34.6 15 21.6 30 9.6Z" fill="@f"/>
<path d="M46 40.6Q55 33 53.6 21.4 58.4 33.6 47.6 41.6 39 47.4 29 48.4 39 45.6 46 40.6Z" ${SH}/>
<g fill="#8A4A12" opacity=".35"><circle cx="38" cy="22" r="1.6"/><circle cx="44" cy="28" r="1.4"/><circle cx="33" cy="32" r="1.6"/><circle cx="40" cy="36" r="1.3"/><circle cx="47" cy="19" r="1.2"/><circle cx="28" cy="40" r="1.3"/></g>
<path d="M29.4 14Q38 10.6 45 13 35 15 29.6 23 26 20.6 29.4 14Z" ${HL}/>`,
  wrap: `<g transform="rotate(-12 32 34)">
<path d="M15 23Q19 10 30 12Q38 7.6 46 13.4Q53 18 49 24.4H16.6Z" fill="@g"/>
<circle cx="24" cy="18" r="3.4" fill="@m"/><circle cx="36" cy="15" r="3" fill="@m"/><circle cx="31" cy="21" r="2.6" fill="@r"/><circle cx="43" cy="20" r="2.6" fill="@m"/>
<path d="M13.4 22.6Q32 16 50.6 22.6L44.4 54.4Q32 58.4 19.6 54.4Z" fill="@c"/>
<path d="M17 37Q32 32 47 37L44.4 54.4Q32 58.4 19.6 54.4Z" fill="@w"/>
<path d="M17.6 40.4Q32 35.4 46.4 40.4L46 43.6Q32 38.6 18.2 43.6Z" fill="@y"/>
<path d="M17.4 25Q20 24 21.6 24L23.6 52 20.6 51Z" ${HL}/></g>`,
  pizza: `
<path d="M32 58 8.6 15.6Q32 5.4 55.4 15.6Z" fill="@y"/>
<path d="M44 12 32 58 55.4 15.6Q50 13 44 12Z" ${SH}/>
<path d="M8.6 15.6Q32 5.4 55.4 15.6L57 11.6Q32 0 7 11.6Z" fill="@f"/>
<circle cx="25" cy="22" r="4.4" fill="@r"/><circle cx="39" cy="20.6" r="4" fill="@r"/><circle cx="32" cy="35" r="4" fill="@r"/><circle cx="34" cy="47" r="2.6" fill="@r"/>
<circle cx="31" cy="25.6" r="1.6" fill="@k"/><circle cx="25.6" cy="31" r="1.4" fill="@g"/><circle cx="40" cy="29.6" r="1.4" fill="@g"/>
<path d="M14 17Q20 14.6 26 14L18.6 24Z" ${HL}/>`,
  bento: `
<rect x="7" y="17" width="50" height="38" rx="7" fill="@k"/>
<rect x="11" y="21" width="21.6" height="30" rx="3.6" fill="@w"/>
<g fill="#000" opacity=".1"><ellipse cx="17" cy="27" rx="1.6" ry=".9"/><ellipse cx="24" cy="31" rx="1.6" ry=".9"/><ellipse cx="18" cy="38" rx="1.6" ry=".9"/><ellipse cx="26" cy="43" rx="1.6" ry=".9"/><ellipse cx="21" cy="46" rx="1.6" ry=".9"/></g>
<rect x="35.6" y="21" width="17.4" height="12.4" rx="3.4" fill="@g"/>
<rect x="35.6" y="36.4" width="17.4" height="14.6" rx="3.4" fill="@f"/>
<circle cx="44" cy="43.6" r="3.6" fill="@r"/>
<path d="M11 19H53" stroke="#fff" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/>`,
  fries: `
<g fill="@y"><rect x="18" y="12" width="5" height="26" rx="2" transform="rotate(-10 20 25)"/><rect x="24.6" y="7" width="5" height="30" rx="2" transform="rotate(-4 27 22)"/><rect x="31" y="9" width="5" height="28" rx="2"/><rect x="37" y="6" width="5" height="30" rx="2" transform="rotate(5 39 21)"/><rect x="42.6" y="12" width="5" height="26" rx="2" transform="rotate(11 45 25)"/></g>
<path d="M14 26.6H50L46.4 55.4Q46 58 43.4 58H20.6Q18 58 17.6 55.4Z" fill="@r"/>
<path d="M14 26.6Q32 35.6 50 26.6L49 33.6Q32 42 15 33.6Z" fill="#000" opacity=".1"/>
<path d="M18 30 21.6 31.6 22 55H20Z" ${HL}/>
<circle cx="32" cy="46" r="5.4" fill="@y"/>
<text x="32" y="48" text-anchor="middle" font-size="5.6" font-weight="700" fill="#1A1A20" font-family="Readex Pro,Arial,sans-serif">K</text>`,
  salad: `
<g transform="rotate(-24 22 28)"><ellipse cx="22" cy="28" rx="9" ry="5" fill="@g"/></g>
<g transform="rotate(20 40 26)"><ellipse cx="40" cy="26" rx="9.4" ry="5.2" fill="@g"/></g>
<circle cx="30" cy="28" r="5" fill="@r"/><circle cx="44" cy="31" r="3.6" fill="@r"/><ellipse cx="20" cy="33" rx="5" ry="3" fill="@c"/><ellipse cx="34" cy="32.4" rx="5" ry="3" fill="@y"/>
<path d="M7 34H57Q57 55 32 55T7 34Z" fill="@w"/>
<path d="M7.6 38H56.4Q55.6 41 55 42.6H9Q8.4 41 7.6 38Z" fill="@t"/>
<path d="M12 45Q16 51 24 53 15 52 11 46Z" ${SH}/>`,
  soda: `
<rect x="33" y="3" width="4" height="20" rx="2" fill="@y" transform="rotate(14 35 13)"/>
<path d="M17 19Q17 13 32 13T47 19Z" fill="@w"/>
<rect x="14" y="18" width="36" height="7" rx="3.4" fill="@w"/>
<path d="M17 25H47L43.4 55.6Q43 58 40.6 58H23.4Q21 58 20.6 55.6Z" fill="@r"/>
<path d="M18.4 36H45.6L44.8 43H19.2Z" fill="@w"/>
<path d="M21 27H25L24.6 54H22.6Z" ${HL}/>`,
  tea: `
<path d="M27 14Q24 8 27 4M34 14Q31 8 34 4" stroke="@s" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" fill="none"/>
<ellipse cx="32" cy="54.4" rx="19" ry="4.4" fill="@w"/>
<path d="M23.6 18Q20 25 23 31Q26 37 22 46Q20 52.4 26 53H38Q44 52.4 42 46Q38 37 41 31Q44 25 40.4 18Z" fill="@a" opacity=".55"/>
<path d="M24.4 24Q22.6 28 23.6 31Q26 37 22.4 46Q20.6 52 26 52.4H38Q43.4 52 41.6 46Q38 37 40.4 31Q41.4 28 39.6 24Z" fill="#C2481A"/>
<path d="M24.4 24H39.6Q41 27 40.4 31Q38 37 41.6 46 43.4 52 38 52.4H32V24Z" ${SH}/>
<path d="M26 26Q25 29 26 32Q27.6 36 25 42" stroke="#fff" stroke-opacity=".5" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<path d="M23.6 18H40.4" stroke="@y" stroke-width="2" stroke-linecap="round"/>`,
  coffee: `
<path d="M24 16Q21 11 24 6M32 16Q29 11 32 6" stroke="@s" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" fill="none"/>
<ellipse cx="30" cy="53" rx="22" ry="4.6" fill="@w"/>
<path d="M45 30.6Q55 30.6 55 37.6T45 44.6" stroke="@w" stroke-width="4.4" fill="none"/>
<path d="M13 26H47V39Q47 52 30 52T13 39Z" fill="@w"/>
<path d="M13 32H47V36H13Z" fill="@y"/>
<ellipse cx="30" cy="26" rx="17" ry="3.8" fill="@m"/>
<path d="M17 37Q17.4 46 24 49.6 15.6 47 15.4 37Z" ${SH}/>`,
  iced: `
<rect x="33.6" y="2" width="3.6" height="22" rx="1.8" fill="@k" transform="rotate(12 35 13)"/>
<path d="M16 19Q16 9 32 9T48 19Z" fill="@w" opacity=".9"/>
<rect x="14.6" y="17.4" width="34.8" height="5" rx="2.4" fill="@w"/>
<path d="M17.4 22.4H46.6L42.6 55.6Q42.2 58 39.8 58H24.2Q21.8 58 21.4 55.6Z" fill="#E8C397"/>
<path d="M18.6 33H45.4L42.6 55.6Q42.2 58 39.8 58H24.2Q21.8 58 21.4 55.6Z" fill="@m" opacity=".75"/>
<g fill="#2A1A10"><circle cx="27" cy="52" r="2.2"/><circle cx="33" cy="53.6" r="2.2"/><circle cx="38.6" cy="51.4" r="2.2"/><circle cx="30" cy="48" r="2.2"/><circle cx="36" cy="47" r="2.2"/></g>
<path d="M21 24.4H24.6L24 54H22.6Z" ${HL}/>`,
  orange: `
<path d="M32 18Q31 10 26 8" stroke="@m" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<path d="M33 16Q40 6 50 10Q44 19 33 16Z" fill="@g"/>
<circle cx="32" cy="37" r="20" fill="@o"/>
<path d="M18 30Q22 21 31 19.6Q24 25 22 34Q19 37 18 30Z" ${HL}/>
<path d="M50 41Q47 52 36 56 49 54 51.6 41Z" ${SH}/>`,
  cake: `
<path d="M8 33.4 50 20 57 28.6 15 42Z" fill="@w"/>
<path d="M15 42 57 28.6V44 15 57.6Z" fill="#FFDFA0"/>
<path d="M15 47.6 57 34.2V38.4L15 51.8Z" fill="@p"/>
<path d="M8 33.4 15 42V57.6L8 49Z" fill="#F0C27A"/>
<path d="M8 33.4 15 42V57.6L8 49Z" ${SH}/>
<circle cx="44" cy="22.6" r="4.6" fill="@r"/><path d="M44 18.4Q45 15 48 15" stroke="@g" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<path d="M18 36 44 27.6" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>`,
  honey: `
<rect x="17" y="12" width="30" height="9" rx="3" fill="@m"/>
<rect x="13" y="20" width="38" height="36" rx="11" fill="@f"/>
<path d="M13 30H51V44H13Z" fill="@c"/>
<path d="M22 30V35Q22 38 24.4 38T26.8 35V30Z M36 30V33Q36 35.4 38 35.4T40 33V30Z" fill="@f"/>
<path d="M18 24H22L20 51Q17 48 17 44Z" ${HL}/>`,
  kunafa: `
<ellipse cx="32" cy="44" rx="25" ry="11" fill="@s"/>
<ellipse cx="32" cy="38.4" rx="23" ry="9.6" fill="@o"/>
<path d="M9 38.4Q9 46 32 47.6T55 38.4V42Q55 50 32 51T9 42Z" fill="@f"/>
<g stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-linecap="round"><path d="M16 36 20 34M24 41 29 39M33 34 38 32M40 41 45 39M22 32 26 31"/></g>
<g fill="@g"><circle cx="28" cy="36" r="1.8"/><circle cx="36" cy="39" r="1.8"/><circle cx="40" cy="34.6" r="1.6"/><circle cx="22" cy="39.4" r="1.6"/><circle cx="32" cy="32.6" r="1.6"/></g>`,
  donut: `
<path fill-rule="evenodd" d="M12 35a20 20 0 1 0 40 0a20 20 0 1 0-40 0ZM26 35a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z" fill="@f"/>
<path fill-rule="evenodd" d="M13.4 32Q14 17 32 16Q50 17 50.6 32Q51 38 46 38Q44 42 40 40Q36 44 30 41Q24 44 20 40Q14 41 13.4 36ZM26 33a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z" fill="@p"/>
<g stroke-width="2" stroke-linecap="round"><path d="M20 26 23 24.6" stroke="#FFD100"/><path d="M38 22 41 23" stroke="#fff"/><path d="M44 30 45 33" stroke="#2A9D55"/><path d="M24 36 26 38" stroke="#2C72DC"/><path d="M30 22 33 21" stroke="#2C72DC"/><path d="M41 37 44 36" stroke="#FFD100"/></g>
<path d="M17 28Q20 20 28 18.4Q22 23 20.4 29Z" ${HL}/>`,
  icecream: `
<path d="M20 31H44L33.6 58.4Q32 61 30.4 58.4Z" fill="@f"/>
<path d="M23 35 38 50M28 33 41 46M41 35 27 50M36 33 25 44" stroke="#000" stroke-opacity=".14" stroke-width="1.4"/>
<circle cx="24.6" cy="28" r="9" fill="@c"/><circle cx="39.4" cy="28" r="9" fill="@m"/>
<circle cx="32" cy="19" r="10.6" fill="@p"/>
<circle cx="33" cy="7.6" r="3.6" fill="@r"/>
<path d="M25 17Q27 11 33 10.4Q28.6 14 28 19Z" ${HL}/>`,
  birthday: `
<g stroke-linecap="round"><path d="M22 20V12M32 20V10M42 20V12" stroke="@u" stroke-width="3"/></g>
<g fill="@o"><path d="M22 10Q19.6 7 22 3.6Q24.4 7 22 10Z"/><path d="M32 8Q29.6 5 32 1.6Q34.4 5 32 8Z"/><path d="M42 10Q39.6 7 42 3.6Q44.4 7 42 10Z"/></g>
<rect x="9" y="20" width="46" height="35" rx="6" fill="@c"/>
<path d="M9 26Q9 20 15 20H49Q55 20 55 26V29Q51 33 47 29Q43 34 39 29Q35 34 31 29Q27 34 23 29Q19 34 15 29Q11 33 9 29Z" fill="@p"/>
<path d="M9 41H55V45H9Z" fill="@p" opacity=".8"/>
<path d="M13 34H17V51Q13 50 13 47Z" ${HL}/>`,
  fish: `
<path d="M7 32Q22 13 42 24.4L56 14.6V49.4L42 39.6Q22 51 7 32Z" fill="@u"/>
<path d="M10 34Q24 44 42 39.6 24 49 10 34Z" fill="@w" opacity=".55"/>
<path d="M30 20Q34 26 30 32" stroke="#fff" stroke-opacity=".45" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<circle cx="17.6" cy="29" r="3.2" fill="@w"/><circle cx="18.2" cy="29" r="1.6" fill="@k"/>
<path d="M14 22Q22 16 32 17Q22 19.6 16 25Z" ${HL}/>`,
  bread: `
<path d="M5 36.4Q18 19 32 17.6Q46 19 59 36.4Q46 52.6 32 54Q18 52.6 5 36.4Z" fill="@f"/>
<path d="M12 36Q22 30 32 30T52 36" stroke="#000" stroke-opacity=".16" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<path d="M14 30Q22 23 30 21.6Q22 27 18 33Z" ${HL}/>
<path d="M10 40Q20 50 32 51.4 46 50 54 40Q46 54 32 54 18 53 10 40Z" ${SH}/>`,
  milk: `
<path d="M18 22 24 11.6H40L46 22V55.6Q46 58 43.6 58H20.4Q18 58 18 55.6Z" fill="@w"/>
<path d="M24 11.6H40L46 22H18Z" fill="@u"/>
<rect x="29" y="5.6" width="6" height="6.4" rx="1.6" fill="@u"/>
<path d="M18 30H46V46H18Z" fill="@u" opacity=".9"/>
<path d="M32 33Q28 38.4 28 40.6A4 4 0 0 0 36 40.6Q36 38.4 32 33Z" fill="@w"/>
<path d="M21 24H24.6V55H21Z" ${HL}/>`,
  eggs: `
<ellipse cx="40" cy="39" rx="12" ry="15" fill="@b"/>
<ellipse cx="24" cy="35" rx="12" ry="15" fill="@c"/><path d="M33 22Q36 35 34 48" stroke="#000" stroke-opacity=".08" stroke-width="3" fill="none"/>
<path d="M16 29Q18 22 24 21Q19.6 26 19.4 33Z" ${HL}/><path d="M33 33Q35 27 40 25.6Q36 30 36 37Z" ${HL}/>`,
  rice: `
<path d="M9.4 35Q11 17.6 32 17.6T54.6 35Z" fill="@w"/>
<g fill="#000" opacity=".1"><ellipse cx="22" cy="28" rx="1.8" ry=".9"/><ellipse cx="30" cy="23" rx="1.8" ry=".9"/><ellipse cx="38" cy="27" rx="1.8" ry=".9"/><ellipse cx="44" cy="31" rx="1.8" ry=".9"/><ellipse cx="27" cy="31" rx="1.8" ry=".9"/></g>
<path d="M7 34H57Q57 55 32 55T7 34Z" fill="@k"/>
<path d="M7.6 38H56.4Q55.8 40.6 55.2 42H8.8Q8.2 40.6 7.6 38Z" fill="@y"/>
<path d="M12 44Q16 50 24 52.6 15 51 11 45Z" fill="#fff" opacity=".18"/>`,
  tomato: `
<path d="M32 16Q50 14 54 32Q56 50 32 55Q8 50 10 32Q14 14 32 16Z" fill="@r"/>
<path d="M32 21 27 14 32 17 36 12.4 35.6 18 42 17.4 36.4 21.4 39 25 32 22.6 25 25 27.6 21.4 22 17.4Z" fill="@g"/>
<path d="M17 28Q20 21 27 20.6Q21 25.6 20 32Z" ${HL}/>`,
  banana: `
<path d="M9.4 18Q12 48 42 52.4Q53 53.6 56 46.6Q36 46 26 34Q18 25 17 14.6Q13 13 9.4 18Z" fill="@y"/>
<path d="M17 14.6Q18 25 26 34Q36 46 56 46.6L54 49.6Q34 49 23 37Q14 26 14 15Z" ${SH}/>
<path d="M17 14.6 15 9.6Q12.6 9.6 12.4 12Z" fill="@m"/><circle cx="56.4" cy="47.6" r="1.8" fill="@m"/>
<path d="M12.6 22Q15 38 26 45 16 41 12 26Z" ${HL}/>`,
  water: `
<path d="M24 19Q24 14.6 28 13V9H36V13Q40 14.6 40 19V55.4Q40 58 37.4 58H26.6Q24 58 24 55.4Z" fill="@a"/>
<rect x="27" y="4" width="10" height="6" rx="1.6" fill="@u"/>
<path d="M24 30H40V43H24Z" fill="@u"/>
<path d="M32 32.6Q29.4 36 29.4 37.6A2.6 2.6 0 0 0 34.6 37.6Q34.6 36 32 32.6Z" fill="#fff"/>
<path d="M26.4 19H29.4V54H26.4Z" ${HL}/>`,
  greens: `
<circle cx="22" cy="36" r="13" fill="@g"/><circle cx="42" cy="36" r="13" fill="@g"/>
<circle cx="32" cy="27" r="14" fill="#9BE58A"/>
<path d="M32 18V50M32 30 24 24M32 36 41 29M32 42 24 37" stroke="#fff" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<circle cx="32" cy="44" r="12" fill="@g" opacity=".5"/>`,
  pill: `
<g transform="rotate(-40 32 32)">
<rect x="9" y="22" width="46" height="20" rx="10" fill="@w"/>
<path d="M32 22H19Q9 22 9 32T19 42H32Z" fill="@r"/>
<rect x="14" y="25" width="14" height="4" rx="2" fill="#fff" opacity=".45"/><rect x="36" y="25" width="14" height="4" rx="2" fill="#fff" opacity=".7"/>
</g>`,
  lemon: `
<path d="M38 13Q48 4 56 9Q50 17 38 13Z" fill="@g"/>
<path d="M8 38Q8 22 26 16Q40 12 50 20Q57 26 56 36Q54 50 36 54Q20 57 12 48Q8 44 8 38Z" fill="@y"/>
<path d="M16 30Q20 22 30 19.4Q22 25 20 34Z" ${HL}/>`,
  mask: `
<path d="M14 26Q6 26 6 33T14 40M50 26Q58 26 58 33T50 40" stroke="@s" stroke-width="2.4" fill="none"/>
<path d="M13 24Q32 17 51 24V39Q32 50 13 39Z" fill="@a"/>
<path d="M15 29Q32 24 49 29M15 34Q32 29 49 34M15 39Q32 34 49 39" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/>`,
  lotion: `
<rect x="27" y="10" width="10" height="9" rx="2" fill="@k"/><path d="M33 10V6H42V9.6" stroke="@k" stroke-width="3" fill="none" stroke-linejoin="round"/>
<rect x="17" y="18" width="30" height="40" rx="8" fill="@t"/>
<rect x="21" y="30" width="22" height="15" rx="3" fill="@w"/>
<path d="M32 33Q29.4 36.6 29.4 38.2A2.6 2.6 0 0 0 34.6 38.2Q34.6 36.6 32 33Z" fill="@t"/>
<path d="M20.6 21H24V55H20.6Z" ${HL}/>`,
  babybottle: `
<path d="M27 15Q27 6 32 6T37 15Z" fill="#F2C48E"/>
<rect x="23" y="14" width="18" height="7" rx="2.4" fill="@p"/>
<rect x="21" y="20" width="22" height="38" rx="8" fill="@w"/>
<path d="M21 40H43V50Q43 58 35 58H29Q21 58 21 50Z" fill="@a"/>
<g stroke="@u" stroke-width="1.6" stroke-linecap="round"><path d="M35 28H40M37 33H40M35 38H40"/></g>
<path d="M24.6 23H27.6V54H24.6Z" ${HL}/>`,
  rose: `
<path d="M32 58V34" stroke="#2A9D55" stroke-width="3" stroke-linecap="round"/>
<path d="M32 46Q22 42 18 46Q24 52 32 48Z M32 40Q42 36 46 40Q40 46 32 42Z" fill="@g"/>
<path d="M16 20Q16 8 32 8T48 20Q48 34 32 34T16 20Z" fill="@r"/>
<path d="M24 18Q24 12 32 12T40 18Q38 24 32 24T24 18Z" fill="#000" opacity=".12"/>
<path d="M28 18Q28 14.6 32 14.6T36 18" stroke="#fff" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round" fill="none"/>
<path d="M19 22Q20 13 27 10.6Q22 16 22 25Z" ${HL}/>`,
  bouquet: `
<path d="M24 32 18 22M40 32 46 22M32 32V16" stroke="@g" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="17" cy="20" r="7" fill="@p"/><circle cx="47" cy="20" r="7" fill="@r"/><circle cx="32" cy="14" r="8" fill="@y"/>
<circle cx="24" cy="27" r="6" fill="@w"/><circle cx="40" cy="27" r="6" fill="@p"/>
<circle cx="32" cy="14" r="3" fill="@o"/>
<path d="M12 30H52L37 58H27Z" fill="@k"/>
<path d="M12 30H22L30 58H27Z" fill="#fff" opacity=".14"/>
<path d="M24.4 42H39.6L38 46H26Z" fill="@y"/>`,
  cart: `
<path d="M5 12H11.6L18 42H49" stroke="@k" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M13.2 18H55.6Q57.6 18 57 20L52.6 35.4Q52 37.4 50 37.4H17.4Z" fill="@y"/>
<path d="M22 22V33M30 22V33M38 22V33M46 22V33" stroke="#000" stroke-opacity=".14" stroke-width="1.6" stroke-linecap="round"/>
<path d="M15 20.6H55" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="22" cy="50" r="4.6" fill="@k"/><circle cx="45" cy="50" r="4.6" fill="@k"/>`,
  plate: `
<path d="M9 14V25Q9 28 11.6 28V54M6 14V24M12.4 14V24" stroke="@s" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<path d="M54 54V36H57Q57.4 18 54 12Q50.4 22 51 36H54" fill="@s"/>
<circle cx="32" cy="35" r="18" fill="@w"/>
<circle cx="32" cy="35" r="12.4" fill="#000" opacity=".07"/>
<circle cx="32" cy="35" r="11" fill="@w"/>
<path d="M19 30Q22 21 30 19Q23.6 24 22 33Z" ${HL}/>`,

  // ---------------------------------------------------------------- send
  box: `
<path d="M32 10 56 20 32 30 8 20Z" fill="@b"/>
<path d="M8 20 32 30V56L8 46Z" fill="@b"/>
<path d="M56 20 32 30V56L56 46Z" fill="@b"/><path d="M56 20 32 30V56L56 46Z" ${SH}/>
<path d="M20.6 14.6 44.6 24.6 42.6 25.6 18.6 15.6Z" fill="@y"/>
<path d="M42.6 25.6 44.6 24.6V32.6L42.6 33.6Z" fill="@y"/>
<path d="M11 23.6 15 25.2V31L11 29.4Z" fill="#fff" opacity=".45"/>`,
  document: `
<path d="M14 10Q14 7 17 7H38L50 19V54Q50 57 47 57H17Q14 57 14 54Z" fill="@w"/>
<path d="M38 7V16Q38 19 41 19H50Z" fill="@s"/>
<g stroke="@s" stroke-width="2.4" stroke-linecap="round"><path d="M21 24H36M21 31H43M21 38H43M21 45H33"/></g>
<circle cx="42" cy="47" r="6" fill="@y"/><path d="M39.4 47 41.4 49 44.6 45.4" stroke="#1A1A20" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  keys: `
<circle cx="20" cy="22" r="10" stroke="@s" stroke-width="3" fill="none"/>
<path fill-rule="evenodd" d="M24 38a10 10 0 1 0 20 0a10 10 0 1 0-20 0Zm6.4 0a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0-7.2 0Z" fill="@y" transform="rotate(-45 34 38)"/>
<path d="M40 44 53 57M47.6 51.6 51 48.2M51.6 55.6 55 52.2" stroke="@y" stroke-width="4" stroke-linecap="round"/>
<path d="M27 29 29 31" stroke="@s" stroke-width="3" stroke-linecap="round"/>`,
  takeout: `
<path d="M20 22Q20 8 32 8T44 22" stroke="@s" stroke-width="2.4" fill="none"/>
<path d="M10 22H54L48 56Q47.6 58 45.6 58H18.4Q16.4 58 16 56Z" fill="@w"/>
<path d="M10 22 20 16H44L54 22Z" fill="@w"/><path d="M10 22 20 16H44L54 22Z" ${SH}/>
<path d="M14.6 30H49.4L48.4 37H15.6Z" fill="@r"/>
<circle cx="32" cy="45.6" r="5.4" fill="@y"/>
<text x="32" y="47.6" text-anchor="middle" font-size="5.6" font-weight="700" fill="#1A1A20" font-family="Readex Pro,Arial,sans-serif">K</text>`,
  sparkle: `
<path d="M28 8Q30.4 26 48 30Q30.4 34 28 52Q25.6 34 8 30Q25.6 26 28 8Z" fill="@y"/>
<path d="M48 8Q49 15 55 16Q49 17 48 24Q47 17 41 16Q47 15 48 8Z" fill="@y"/>
<path d="M50 40Q50.8 45 55 46Q50.8 47 50 52Q49.2 47 45 46Q49.2 45 50 40Z" fill="@o"/>`,

  // ---------------------------------------------------------------- everyday
  bell: `
<circle cx="32" cy="9" r="3.6" fill="@y"/>
<path d="M32 11Q47 11 47 28V38Q47 42 53 46Q55 48.6 52 48.6H12Q9 48.6 11 46Q17 42 17 38V28Q17 11 32 11Z" fill="@y"/>
<path d="M22 24Q24 15.6 31 14.6Q25.6 19 25.6 30Z" ${HL}/>
<path d="M26 50Q26 57 32 57T38 50Z" fill="@k"/>`,
  pin: `
<ellipse cx="32" cy="57" rx="9" ry="2.6" fill="#000" opacity=".15"/>
<path d="M32 56Q14 37 14 24A18 18 0 0 1 50 24Q50 37 32 56Z" fill="@y"/>
<circle cx="32" cy="24" r="7.4" fill="@k"/>
<path d="M19 21Q21 11 30 9Q22 15 22.4 27Z" ${HL}/>`,
  map: `
<path d="M6 16 22 10 42 16 58 10V48L42 54 22 48 6 54Z" fill="@w"/>
<path d="M22 10V48L42 54V16Z" fill="#000" opacity=".07"/>
<path d="M10 42Q18 30 26 34T40 26 54 18" stroke="@g" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 4.4" fill="none"/>
<path d="M44 28Q37 20 37 15.6A7 7 0 0 1 51 15.6Q51 20 44 28Z" fill="@r"/><circle cx="44" cy="15.6" r="2.6" fill="@w"/>`,
  party: `
<path d="M8 56 20 22 42 44Z" fill="@y"/>
<path d="M14 39 27 51M17 30 34 46" stroke="#1A1A20" stroke-opacity=".7" stroke-width="2.6"/>
<path d="M8 56 13 42 20 49Z" ${SH}/>
<g stroke-width="3" stroke-linecap="round"><path d="M30 14Q34 18 32 22" stroke="#E3457D" fill="none"/><path d="M46 26Q50 22 55 24" stroke="#2C72DC" fill="none"/><path d="M40 10V16" stroke="#2A9D55"/></g>
<circle cx="50" cy="12" r="2.6" fill="@r"/><circle cx="54" cy="36" r="2.4" fill="@y"/><rect x="24" y="6" width="4" height="4" rx="1" fill="@o"/><circle cx="44" cy="38" r="2" fill="@g"/>`,
  bubble: `
<path d="M12 12H52Q57 12 57 17V39Q57 44 52 44H30L18 54V44H12Q7 44 7 39V17Q7 12 12 12Z" fill="@y"/>
<circle cx="21" cy="28" r="3.4" fill="@k"/><circle cx="32" cy="28" r="3.4" fill="@k"/><circle cx="43" cy="28" r="3.4" fill="@k"/>
<path d="M11 17Q11 15.4 13 15.4H30" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  flag: `
<rect x="12" y="6" width="4" height="52" rx="2" fill="@k"/>
<path d="M16 9Q30 4 38 10T56 11V35Q46 40 38 34T16 35Z" fill="@w"/>
<g fill="#1A1A20"><path d="M16 9Q21 7.4 26 7.6V16Q21 15.6 16 17Z"/><path d="M36 9.6Q41 13 46 12.6V21Q41 21.4 36 18Z"/><path d="M26 16Q31 16 36 18V27Q31 24.6 26 24.6Z"/><path d="M46 21 56 19.4V27.6Q51 30.4 46 29.4Z"/><path d="M16 25Q21 23.6 26 24.6V33.6Q21 33 16 35Z"/><path d="M36 27Q41 30 46 29.4V37.6Q41 37.6 36 35Z"/></g>`,
  briefcase: `
<path d="M24 18V14Q24 10 28 10H36Q40 10 40 14V18" stroke="@k" stroke-width="3.2" fill="none"/>
<rect x="7" y="18" width="50" height="36" rx="6" fill="@m"/>
<path d="M7 30Q32 38 57 30" stroke="#000" stroke-opacity=".2" stroke-width="2" fill="none"/>
<rect x="27" y="29" width="10" height="7" rx="2" fill="@y"/>
<path d="M11 22H15V50H11Z" ${HL}/>`,
  star: `
<path d="M32 6 39.6 22.4 57.4 24.4 44.2 36.6 47.8 54.2 32 45.2 16.2 54.2 19.8 36.6 6.6 24.4 24.4 22.4Z" fill="@y"/>
<path d="M32 6 24.4 22.4 6.6 24.4 19.8 36.6 22 33Q16 28 14.6 26.6L27 25Z" ${HL}/>`,
  warning: `
<path d="M28.6 9.6Q32 4 35.4 9.6L58 49Q60.4 54 55 54H9Q3.6 54 6 49Z" fill="@y"/>
<rect x="29" y="20" width="6" height="19" rx="3" fill="@k"/><circle cx="32" cy="46" r="3.4" fill="@k"/>
<path d="M12 46 26 21" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/>`,
  siren: `
<path d="M14 28Q14 10 32 10T50 28V44H14Z" fill="@u"/>
<path d="M32 10Q50 10 50 28V44H32Z" fill="@r"/>
<path d="M20 26Q21 16 29 14Q24 19 24 30Z" ${HL}/>
<rect x="8" y="43" width="48" height="11" rx="3.4" fill="@k"/>
<path d="M4 18 9 21M60 18 55 21M10 6 14 11M54 6 50 11" stroke="@y" stroke-width="2.6" stroke-linecap="round"/>`,
  barrier: `
<rect x="14" y="34" width="5" height="22" rx="1.6" fill="@s"/><rect x="45" y="34" width="5" height="22" rx="1.6" fill="@s"/>
<rect x="6" y="16" width="52" height="20" rx="3" fill="@w"/>
<path d="M10 16H20L8 34V20ZM28 16H38L24 36H14ZM46 16H56L42 36H32ZM58 26V36H50Z" fill="@r"/>
<circle cx="12" cy="11" r="4" fill="@o"/><circle cx="52" cy="11" r="4" fill="@o"/>`,
  cone: `
<rect x="10" y="50" width="44" height="7" rx="2.6" fill="@k"/>
<path d="M27 8Q32 4 37 8L49 51H15Z" fill="@o"/>
<path d="M22.6 24H41.4L43.4 32H20.6ZM18.4 38H45.6L47.4 45H16.6Z" fill="@w"/>
<path d="M27 8Q29 7 30.6 7L24 49H20Z" ${HL}/>`,
  fuel: `
<path d="M44 20H50Q53 20 53 23V42Q53 46 49 46T45 42V32" stroke="@k" stroke-width="3" fill="none" stroke-linecap="round"/>
<rect x="11" y="10" width="32" height="46" rx="5" fill="@g"/>
<rect x="16" y="16" width="22" height="13" rx="2.6" fill="@w"/>
<path d="M27 35Q22 41 22 43.6A5 5 0 0 0 32 43.6Q32 41 27 35Z" fill="@y"/>
<rect x="8" y="53" width="38" height="5" rx="2" fill="@k"/>
<path d="M14.6 13H18V50H14.6Z" ${HL}/>`,
  storm: `
<path d="M16 38Q6 38 6 30T15 21Q17 11 28 11 37 11 41 19Q52 18 55 27 58 38 47 38Z" fill="@s"/>
<path d="M15 24Q17 15 27 14" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<path d="M33 36 25 48H32L28 59 41 44H34L38 36Z" fill="@y"/>
<g stroke="@u" stroke-width="2.6" stroke-linecap="round"><path d="M16 44 13 51M47 44 44 51"/></g>`,
  crash: `
<path d="M32 4 37 19 52 10 45 25 60 30 45 35 52 50 37 41 32 58 27 41 12 50 19 35 4 30 19 25 12 10 27 19Z" fill="@o"/>
<path d="M32 16 35 25 44 21 40 30 48 32 40 35 44 43 35 38 32 47 29 38 20 43 24 35 16 32 24 30 20 21 29 25Z" fill="@y"/>`,
  paw: `
<path d="M32 4 60 32 32 60 4 32Z" fill="@y" stroke="#1A1A20" stroke-width="0"/>
<path d="M32 9 55 32 32 55 9 32Z" fill="none" stroke="#1A1A20" stroke-width="2"/>
<g fill="#1A1A20"><ellipse cx="32" cy="38" rx="7" ry="6"/><ellipse cx="24" cy="29" rx="3" ry="4"/><ellipse cx="29.6" cy="24.6" rx="3" ry="4"/><ellipse cx="34.4" cy="24.6" rx="3" ry="4"/><ellipse cx="40" cy="29" rx="3" ry="4"/></g>`,
  sos: `
<circle cx="32" cy="32" r="19" stroke="@w" stroke-width="11" fill="none"/>
<circle cx="32" cy="32" r="19" stroke="@r" stroke-width="11" fill="none" stroke-dasharray="14.9 14.9" transform="rotate(-38 32 32)"/>
<circle cx="32" cy="32" r="24.6" stroke="#000" stroke-opacity=".08" stroke-width="1" fill="none"/>`,
  shop: `
<rect x="10" y="26" width="44" height="30" rx="3" fill="@w"/>
<rect x="27" y="36" width="10" height="20" rx="2" fill="@k"/>
<rect x="14" y="34" width="9" height="9" rx="2" fill="@a"/><rect x="41" y="34" width="9" height="9" rx="2" fill="@a"/>
<path d="M8 12H56L59 24Q59 30 53.4 30T47.6 24Q47.6 30 42 30T36.4 24Q36.4 30 30.8 30T25.2 24Q25.2 30 19.6 30T14 24Q14 30 8.6 30 5 30 5 24Z" fill="@y"/>
<path d="M19.4 12H25.2L25.2 24Q25.2 30 19.6 30Z M36.4 12H42L47.6 24Q47.6 30 42 30 36.4 30 36.4 24Z" fill="#fff" opacity=".55"/>`,
  idcard: `
<rect x="5" y="13" width="54" height="38" rx="6" fill="@w"/>
<path d="M5 22V19Q5 13 11 13H53Q59 13 59 19V22Z" fill="@u"/>
<rect x="11" y="27" width="15" height="18" rx="3" fill="@a"/>
<circle cx="18.6" cy="33.4" r="3.6" fill="@u"/><path d="M12.6 45Q13.4 38.6 18.6 38.6T24.6 45Z" fill="@u"/>
<g stroke="@s" stroke-width="2.4" stroke-linecap="round"><path d="M31 30H52M31 36H48M31 42H44"/></g>`,
  license: `
<rect x="5" y="13" width="54" height="38" rx="6" fill="@y"/>
<path d="M5 22V19Q5 13 11 13H53Q59 13 59 19V22Z" fill="@k"/>
<rect x="10" y="27" width="16" height="18" rx="3" fill="@w"/>
<circle cx="18" cy="33.4" r="3.4" fill="@s"/><path d="M12.4 45Q13 38.6 18 38.6T23.6 45Z" fill="@s"/>
<path d="M33 38 36 32H48L51 38V43H33Z" fill="@k"/><circle cx="37" cy="43.6" r="2" fill="@k"/><circle cx="47" cy="43.6" r="2" fill="@k"/>
<path d="M31 29H44" stroke="#1A1A20" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>`,
  camera: `
<path d="M22 16 26 10H38L42 16Z" fill="@k"/>
<rect x="6" y="16" width="52" height="36" rx="7" fill="@k"/>
<circle cx="32" cy="34" r="12.6" fill="@s"/><circle cx="32" cy="34" r="8.6" fill="@u"/>
<circle cx="29" cy="31" r="2.6" fill="#fff" opacity=".7"/>
<rect x="46" y="21" width="7" height="4" rx="1.6" fill="@y"/>
<path d="M10 20H24" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/>`,
  phone: `
<rect x="16" y="5" width="32" height="54" rx="7" fill="@k"/>
<rect x="19.4" y="10" width="25.2" height="43" rx="3.6" fill="@u"/>
<rect x="27" y="7" width="10" height="2" rx="1" fill="#000" opacity=".5"/>
<path d="M21.6 14H25L21.6 30Z" ${HL}/>
<circle cx="32" cy="27" r="5" fill="@y"/><path d="M24 44Q25 35 32 35T40 44Z" fill="@y"/>`,
  selfie: `
<rect x="16" y="5" width="32" height="54" rx="7" fill="@k"/>
<rect x="19.4" y="10" width="25.2" height="43" rx="3.6" fill="@a"/>
<circle cx="32" cy="27" r="6.4" fill="#F2C48E"/><path d="M22 47Q23 36 32 36T42 47Z" fill="@u"/>
<path d="M25.6 25Q26 19 32 19T38.4 25Q35 22 32 22.6T25.6 25Z" fill="@m"/>
<circle cx="32" cy="7.4" r="1.2" fill="@s"/>`,
  shield: `
<path d="M32 5 54 13V30Q54 47 32 59Q10 47 10 30V13Z" fill="@t"/>
<path d="M32 5V59Q10 47 10 30V13Z" fill="#fff" opacity=".18"/>
<path d="M22 32 29 39 43 24" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  flask: `
<path d="M27 8V23L11.6 50Q8.6 57 16.4 57H47.6Q55.4 57 52.4 50L37 23V8Z" fill="@a"/>
<path d="M17.4 40H46.6L52.4 50Q55.4 57 47.6 57H16.4Q8.6 57 11.6 50Z" fill="@g"/>
<rect x="24" y="4" width="16" height="5" rx="2.4" fill="@k"/>
<path d="M29.6 12V24L20 41" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" fill="none"/>
<circle cx="26" cy="49" r="2.6" fill="#fff" opacity=".6"/><circle cx="36" cy="46" r="1.8" fill="#fff" opacity=".6"/>`,
  ticket: `
<path d="M8 18Q8 14 12 14H52Q56 14 56 18V26Q51 26 51 32T56 38V46Q56 50 52 50H12Q8 50 8 46V38Q13 38 13 32T8 26Z" fill="@y"/>
<path d="M40 16V48" stroke="#1A1A20" stroke-opacity=".4" stroke-width="2" stroke-dasharray="3 3"/>
<circle cx="19" cy="26" r="3.4" fill="@k"/><circle cx="31" cy="38" r="3.4" fill="@k"/><path d="M32 24 18 40" stroke="#1A1A20" stroke-width="3" stroke-linecap="round"/>
<path d="M12 18H36" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`,
  flag_iq: `
<clipPath id="ID-cq"><rect x="4" y="14" width="56" height="36" rx="5"/></clipPath>
<g clip-path="url(#ID-cq)"><rect x="4" y="14" width="56" height="12" fill="#CE1126"/><rect x="4" y="26" width="56" height="12" fill="#fff"/><rect x="4" y="38" width="56" height="12" fill="#000"/>
<text x="32" y="35.6" text-anchor="middle" font-size="8.4" font-weight="700" fill="#007A3D" font-family="Readex Pro,Tahoma,sans-serif">الله أكبر</text></g>`,
  flag_ae: `
<clipPath id="ID-ca"><rect x="4" y="14" width="56" height="36" rx="5"/></clipPath>
<g clip-path="url(#ID-ca)"><rect x="4" y="14" width="56" height="12" fill="#00732F"/><rect x="4" y="26" width="56" height="12" fill="#fff"/><rect x="4" y="38" width="56" height="12" fill="#000"/><rect x="4" y="14" width="15" height="36" fill="#FF0000"/></g>`,
  flag_sy: `
<clipPath id="ID-cs"><rect x="4" y="14" width="56" height="36" rx="5"/></clipPath>
<g clip-path="url(#ID-cs)"><rect x="4" y="14" width="56" height="12" fill="#007A3D"/><rect x="4" y="26" width="56" height="12" fill="#fff"/><rect x="4" y="38" width="56" height="12" fill="#000"/>
<g fill="#CE1126"><path d="M20 28.4 21.1 31.4H24.3L21.7 33.3 22.7 36.3 20 34.4 17.3 36.3 18.3 33.3 15.7 31.4H18.9Z"/><path d="M32 28.4 33.1 31.4H36.3L33.7 33.3 34.7 36.3 32 34.4 29.3 36.3 30.3 33.3 27.7 31.4H30.9Z"/><path d="M44 28.4 45.1 31.4H48.3L45.7 33.3 46.7 36.3 44 34.4 41.3 36.3 42.3 33.3 39.7 31.4H42.9Z"/></g></g>`,
};

// Emoji and keyword → glyph. Old data in the database still holds emoji, so they keep working.
const ALIAS: Record<string, string> = {
  '🚖': 'taxi', '🚕': 'taxi', '🚗': 'sedan', '🚙': 'suv', '🚐': 'van', '🛵': 'scooter', '🏍': 'scooter', '🚲': 'bicycle', '🚘': 'license',
  '🍔': 'burger', '🍢': 'skewer', '🍗': 'drumstick', '🍖': 'drumstick', '🌯': 'wrap', '🥙': 'wrap', '🌮': 'wrap', '🍕': 'pizza', '🍱': 'bento',
  '🍟': 'fries', '🥗': 'salad', '🥤': 'soda', '🍵': 'tea', '☕': 'coffee', '🧋': 'iced', '🍊': 'orange', '🧃': 'orange', '🍰': 'cake', '🧁': 'cake',
  '🍯': 'honey', '🧀': 'kunafa', '🍩': 'donut', '🍪': 'donut', '🍨': 'icecream', '🍦': 'icecream', '🎂': 'birthday', '🐟': 'fish', '🐠': 'fish', '🦐': 'fish',
  '🍞': 'bread', '🥖': 'bread', '🥐': 'bread', '🥛': 'milk', '🥚': 'eggs', '🍚': 'rice', '🍛': 'rice', '🍅': 'tomato', '🍌': 'banana', '💧': 'water',
  '🥬': 'greens', '🥦': 'greens', '💊': 'pill', '🍋': 'lemon', '😷': 'mask', '🧴': 'lotion', '👶': 'babybottle', '🍼': 'babybottle', '🌹': 'rose', '🌷': 'rose',
  '💐': 'bouquet', '🎁': 'gift', '🛒': 'cart', '🍽': 'plate', '🍴': 'plate', '📦': 'box', '📄': 'document', '📃': 'document', '🔑': 'keys', '🥡': 'takeout',
  '✨': 'sparkle', '🔔': 'bell', '📍': 'pin', '🗺': 'map', '🎉': 'party', '🎊': 'party', '👋': 'bubble', '🏁': 'flag', '🏠': 'house', '🏡': 'house', '💼': 'briefcase',
  '⭐': 'star', '🌟': 'star', '⚠': 'warning', '👮': 'siren', '🚓': 'siren', '🚧': 'barrier', '🦺': 'cone', '⛽': 'fuel', '⛈': 'storm', '🌧': 'storm',
  '💥': 'crash', '🐄': 'paw', '🐑': 'paw', '🆘': 'sos', '🏪': 'shop', '🪪': 'idcard', '🤳': 'selfie', '📸': 'camera', '📷': 'camera', '📱': 'phone',
  '🛡': 'shield', '🛍': 'bag', '🧪': 'flask', '🎟': 'ticket', '🏷': 'ticket', '🇮🇶': 'flag_iq', '🇦🇪': 'flag_ae', '🇸🇾': 'flag_sy',
  // store categories and service keys
  restaurant: 'plate', cafe: 'coffee', sweets: 'cake', grocery: 'cart', flowers: 'bouquet', market: 'bag', food: 'burger',
  ride: 'taxi', delivery: 'box', order: 'bag', parcel: 'box', documents: 'document', other: 'sparkle',
  ECONOMY: 'sedan', COMFORT: 'suv', XL: 'van', BIKE: 'scooter', BICYCLE: 'bicycle', CAR: 'sedan',
};

/** The glyph name for a glyph name, an emoji, or a category key. Unknown values get `fallback`. */
export function glyphKey(v: string | null | undefined, fallback = 'bag'): string {
  if (!v) return fallback;
  const s = String(v).trim();
  if (GLYPHS[s]) return s;
  const bare = s.replace(/[️‍]/g, '');
  return ALIAS[s] ?? ALIAS[bare] ?? ALIAS[[...bare][0] ?? ''] ?? fallback;
}

/** Glyph names the admin can pick for stores, products and banners. */
export const PICKABLE = [
  'plate', 'burger', 'skewer', 'drumstick', 'wrap', 'pizza', 'bento', 'fries', 'salad', 'fish', 'rice', 'soda', 'tea', 'coffee', 'iced', 'orange',
  'cake', 'birthday', 'donut', 'icecream', 'honey', 'kunafa', 'bread', 'milk', 'eggs', 'tomato', 'banana', 'lemon', 'greens', 'water', 'cart', 'bag',
  'pharmacy', 'pill', 'lotion', 'mask', 'babybottle', 'rose', 'bouquet', 'gift', 'box', 'takeout', 'document', 'keys', 'taxi', 'sedan', 'scooter',
  'ticket', 'star', 'sparkle', 'party', 'shop', 'house', 'homefix', 'carfix',
];

let seq = 0;
/** SVG markup (inner + defs) for a glyph; `uid` must be unique per element on the page. */
export function glyphInner(name: string, uid?: string): string {
  const id = 'kg' + (uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '') : String(++seq));
  const body = (GLYPHS[name] ?? GLYPHS.bag).replace(/ID-/g, `${id}-`);
  const used = new Set<string>();
  const out = body.replace(/"@([a-z])"/g, (_, k: string) => {
    used.add(k);
    return `"url(#${id}${k})"`;
  });
  const defs = [...used]
    .map((k) => `<linearGradient id="${id}${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL[k][0]}"/><stop offset="1" stop-color="${PAL[k][1]}"/></linearGradient>`)
    .join('');
  return `<defs>${defs}</defs>${out}`;
}

/** A complete <svg> string, for places that build HTML by hand (map markers). */
export function glyphSvg(v: string | null | undefined, size = 24, fallback?: string): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${glyphInner(glyphKey(v, fallback))}</svg>`;
}
