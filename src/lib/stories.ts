export type Story = {
  id: string;
  title: string;
  meta: string;
  paras: string[];
};

export const STORIES: Story[] = [
  {
    id: "forest",
    title: "The Lantern Forest",
    meta: "Rain pairing · about 8 minutes",
    paras: [
      "You are standing at the edge of a quiet forest, just as evening begins to soften the sky. The path ahead is covered in moss, and every step you take feels slow, safe, and easy.",
      "A small lantern glows in your hand. Its warm circle of light moves gently over roots, stones, and tiny ferns. Nothing asks anything of you here. The forest is simply holding the night open.",
      "You hear rain touching leaves high above you. It does not fall hard. It arrives in thousands of tiny sounds, a soft pattern that changes every moment and still feels steady.",
      "Further in, the trees grow wider and older. Their branches meet overhead like kind hands. You breathe in the scent of pine, damp earth, and cool evening air.",
      "A stream appears beside the path. The water slips over smooth stones, silver in the lantern light. You pause there and let the sound smooth the edges of your thoughts.",
      "Soon the path opens into a small clearing. There is a wooden bench beneath an old cedar. You sit down, rest the lantern beside you, and feel the bench supporting your whole body.",
      "Your shoulders lower. Your hands become still. The rain continues in the leaves, the stream continues over the stones, and the dark between the trees feels peaceful and complete.",
      "The lantern grows softer. The forest grows quieter. Your thoughts drift away one by one, like leaves floating downstream, until there is only breath, warmth, and sleep.",
    ],
  },
  {
    id: "cove",
    title: "The Moonlit Cove",
    meta: "Ocean pairing · about 8 minutes",
    paras: [
      "You arrive at a sheltered cove under a pale moon. The sea is calm, and the water moves in long silver lines toward the sand.",
      "The beach is warm from the day. As you walk, the sand gives gently beneath your feet, and the air carries the clean scent of salt and night flowers growing near the cliffs.",
      "You find a smooth place to lie back, close enough to hear every small wave arrive and return. Each wave has all the time in the world.",
      "The moon hangs above the water, bright but soft. Its light spreads across the cove in a quiet path, and you let your eyes rest there without needing to follow any thought.",
      "A breeze moves across your face. It is cool in the gentlest way. Your breathing begins to match the ocean: in as the wave arrives, out as it slips back.",
      "The cliffs around the cove make the whole world feel protected. Far away, life may still be moving, but here there is only water, moonlight, and rest.",
      "Your body settles more deeply into the sand. Your jaw loosens. Your eyes grow heavy. The sea keeps breathing for you.",
      "The last thing you notice is the sound of the water, soft and endless, carrying you beyond the shore and into sleep.",
    ],
  },
  {
    id: "cottage",
    title: "The Snow Cottage",
    meta: "Brown noise pairing · about 8 minutes",
    paras: [
      "High in the mountains, a small cottage glows through falling snow. Its windows are amber, and smoke curls slowly from the chimney into the cold blue air.",
      "You open the door and step inside. Warmth gathers around you at once, deep and steady, the kind of warmth that makes every muscle remember how to let go.",
      "A fire is burning low in the hearth. It crackles now and then, never sharply, just enough to make the room feel alive and cared for.",
      "There is a chair waiting beside the fire, with a thick blanket folded over one arm. You sit down and draw the blanket around your shoulders.",
      "Outside, snow continues to fall. Through the small window you can see large flakes passing the glass, each one moving at its own quiet pace.",
      "Inside, nothing needs to happen. The fire keeps its gentle rhythm. The walls hold out the cold. The chair holds you completely.",
      "Your breathing slows. Your feet are warm. Your hands are relaxed. The day becomes distant, softened by the blanket, the firelight, and the snow.",
      "The room grows dimmer and kinder. You are safe here for the whole night. The fire will keep glowing, the snow will keep falling, and you can sleep.",
    ],
  },
];
