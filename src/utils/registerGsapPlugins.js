/**
 * GSAP para app cocina (web): scroll, listas KDS, transiciones, eases avanzados y useGSAP.
 */
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { RoughEase, SlowMo, ExpoScaleEase } from 'gsap/EasePack';

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  Flip,
  Observer,
  MotionPathPlugin,
  ScrollToPlugin,
  TextPlugin,
  CustomEase,
  RoughEase,
  SlowMo,
  ExpoScaleEase
);

export { gsap, useGSAP };
