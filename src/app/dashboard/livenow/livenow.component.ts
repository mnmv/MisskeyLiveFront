import { Component, OnDestroy, OnInit } from '@angular/core';
import * as io from 'socket.io-client';
import {environment} from '../../../environments/environment';
import {SessionService} from '../../core/service/session.service';
import {HttpClient} from '@angular/common/http';
import { faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons/faMicrophoneSlash';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons/faMicrophone';
import { faVolumeUp } from '@fortawesome/free-solid-svg-icons/faVolumeUp';
import { faVolumeMute } from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons/faEyeSlash';

@Component({
  selector: 'app-livenow',
  templateUrl: './livenow.component.html',
  styleUrls: ['./livenow.component.scss']
})
export class LivenowComponent implements OnInit, OnDestroy {

  supportBrowser = true;
  server: string;
  streamKey: string;
  stream: MediaStream;
  mics: MediaStreamTrack[];
  recorder = null;
  isMicMute = false;
  isDesktopMute = false;
  isPreviewMute = true;

  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faVolumeUp = faVolumeUp;
  faVolumeMute = faVolumeMute;
  faEye = faEye;
  faEyeSlash = faEyeSlash;

  constructor(private httpClient: HttpClient) { }

  ngOnInit() {
    if (!('getDisplayMedia' in navigator.mediaDevices) || !('MediaRecorder' in window)) {
      this.supportBrowser = false;
      return;
    }
    this.httpClient.get<any>(`${environment.api}/api/data/${SessionService.user.username}?i=${SessionService.token}`)
      .subscribe(data => {
        this.server = data.server;
        this.streamKey = data.live_token;
        this.setup();
      });
  }

  ngOnDestroy() {
    this.stop();
  }

  async setup() {
    // @ts-ignore
    this.stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true});
    this.isDesktopMute = false;
    try {
      this.mics = (await navigator.mediaDevices.getUserMedia({audio: true})).getAudioTracks();
      this.mics.forEach(mic => {
        mic.enabled = true;
        this.stream.addTrack(mic);
      });
      this.isMicMute = false;
    } catch (e) {}
  }

  toggleMicMute() {
    this.isMicMute = this.isMicMute === false;
    this.muteMic(this.isMicMute);
  }

  toggleDesktopMute() {
    this.isDesktopMute = this.isDesktopMute === false;
    this.muteDesktop(this.isDesktopMute);
  }

  muteMic(mute: boolean) {
    this.mics.forEach(mic => this.mute(mic.id, mute));
  }

  muteDesktop(mute: boolean) {
    this.stream.getAudioTracks().filter(track => !this.mics.includes(track)).forEach(track => this.mute(track.id, mute));
  }

  mute(trackId: string, mute: boolean) {
    this.stream.getTrackById(trackId).enabled = !mute;
  }

  start() {
    const socket = io(`wss://livenow-${this.server}.arkjp.net`);
    socket.emit('start', {stream_key: `${SessionService.user.username}?token=${this.streamKey}`});
    // @ts-ignore
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = e => socket.emit('video', e.data);
    this.recorder.onstop = socket.close.bind(socket);
    socket.on('stop', this.stop.bind(this));
    this.recorder.start(0);
  }

  stop() {
    this.recorder.stop();
    this.recorder = null;
  }
}