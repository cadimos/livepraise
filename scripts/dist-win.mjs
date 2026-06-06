#!/usr/bin/env node
import { runElectronBuilder } from './electron-dist.mjs';

runElectronBuilder('--win --x64');
