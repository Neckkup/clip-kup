import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill, Audio, Composition, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {ExampleScene} from './example/ExampleScene';
import {DURATION as EX_DURATION, VO as EX_VO} from './example/timeline';
import {BG, FormatCtx} from './shared';

export const FPS = 30;
type Line = {src: string; at: number; len: number; text: string};

// Thai font for canvas textures + captions. Files live in public/.
const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const faces = [
      new FontFace('Sarabun', `url(${staticFile('Sarabun-Regular.ttf')})`, {weight: '400'}),
      new FontFace('Sarabun', `url(${staticFile('Sarabun-Bold.ttf')})`, {weight: '700'}),
      new FontFace('Sarabun', `url(${staticFile('Sarabun-Regular.ttf')})`, {weight: '300'}),
    ];
    Promise.all(faces.map((f) => f.load())).then((fs) => {
      fs.forEach((f) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(f));
      continueRender(handle);
    });
  }, [handle]);
};

// Music ducks to 40% under every voice line.
const musicVolume = (lines: Line[], total: number) => (f: number) => {
  const t = f / FPS;
  const base = interpolate(t, [0, 0.6, total - 1.6, total], [0, 0.55, 0.55, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let duck = 1;
  for (const v of lines) {
    duck = Math.min(duck, interpolate(t, [v.at - 0.25, v.at, v.at + v.len, v.at + v.len + 0.35], [1, 0.4, 0.4, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  }
  return base * duck;
};

// Small captions, portrait only (user feedback: big captions were too much).
const Captions: React.FC<{lines: Line[]}> = ({lines}) => {
  const t = useCurrentFrame() / FPS;
  const cur = lines.find((l) => t >= l.at - 0.05 && t <= l.at + l.len + 0.25);
  if (!cur) return null;
  const k = interpolate(t, [cur.at - 0.05, cur.at + 0.15, cur.at + cur.len + 0.05, cur.at + cur.len + 0.25], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 220}}>
      <div style={{
        opacity: k, transform: `translateY(${(1 - k) * 20}px)`, fontFamily: 'Sarabun', fontWeight: 700, fontSize: 38, color: '#fff',
        background: 'rgba(22,17,13,0.72)', padding: '10px 24px', borderRadius: 18, maxWidth: 900, textAlign: 'center', lineHeight: 1.35,
        border: '1.5px solid rgba(255,176,32,0.45)',
      }}>{cur.text}</div>
    </AbsoluteFill>
  );
};

type ClipProps = {scene: React.ReactNode; lines: Line[]; total: number; audio: boolean; captions: boolean};
export const Clip: React.FC<ClipProps> = ({scene, lines, total, audio, captions}) => {
  useFonts();
  const {width, height} = useVideoConfig();
  const portrait = height > width;
  return (
    <AbsoluteFill style={{background: BG}}>
      {/* tone mapping happens in <Post/>; renderer stays linear */}
      <ThreeCanvas width={width} height={height} gl={{antialias: false, toneMapping: THREE.NoToneMapping}} camera={{fov: 38, position: [0, 15, 13]}}>
        <FormatCtx.Provider value={{portrait}}>{scene}</FormatCtx.Provider>
      </ThreeCanvas>
      <AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
      {portrait && captions && <Captions lines={lines} />}
      {audio && <Audio src={staticFile('music.mp3')} volume={musicVolume(lines, total)} />}
      {audio && lines.map((v) => (
        <Sequence key={v.src} from={Math.round(v.at * FPS)}>
          <Audio src={staticFile(v.src)} volume={1.6} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Set audio: true once public/music.mp3 and every VO wav exist.
const Example: React.FC = () => <Clip scene={<ExampleScene />} lines={EX_VO} total={EX_DURATION} audio={false} captions />;

export const Root: React.FC = () => (
  <>
    <Composition id="Example" component={Example} durationInFrames={EX_DURATION * FPS} fps={FPS} width={1920} height={1080} />
    <Composition id="ExampleVertical" component={Example} durationInFrames={EX_DURATION * FPS} fps={FPS} width={1080} height={1920} />
  </>
);
