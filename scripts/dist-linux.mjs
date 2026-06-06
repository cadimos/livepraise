#!/usr/bin/env node
import { runElectronBuilder } from './electron-dist.mjs';

runElectronBuilder('--linux AppImage deb rpm pacman --x64');
