export default {
    onLoad() {
        if (document.getElementById('rev-vertical-hud')) return;

        // --- Styles: Vertical, Clean Black Glass (No Glow, No Shadow) ---
        const style = document.createElement('style');
        style.innerHTML = `
            #rev-vertical-hud {
                position: fixed;
                top: 80px;
                right: 15px;
                width: 150px;
                background: rgba(10, 10, 10, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                padding: 14px 10px;
                color: #f1f1f1;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                z-index: 999999;
                user-select: none;
            }
            .rev-hud-title {
                font-size: 11px;
                font-weight: 700;
                text-align: center;
                margin-bottom: 12px;
                color: #ffffff;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                padding-bottom: 6px;
            }
            .rev-field {
                margin-bottom: 12px;
            }
            .rev-field:last-child {
                margin-bottom: 0;
            }
            .rev-info {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #aaa;
                margin-bottom: 4px;
            }
            .rev-range {
                width: 100%;
                -webkit-appearance: none;
                appearance: none;
                height: 3px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 2px;
                outline: none;
            }
            .rev-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 11px;
                height: 11px;
                border-radius: 50%;
                background: #ffffff;
            }
            #rev-status-btn {
                width: 100%;
                margin-top: 8px;
                padding: 6px;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: #fff;
                font-size: 10px;
                font-weight: 600;
                border-radius: 6px;
                text-align: center;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // --- UI Element (Vertical Layout) ---
        const hud = document.createElement('div');
        hud.id = 'rev-vertical-hud';
        hud.innerHTML = `
            <div class="rev-hud-title">Audio HUD</div>
            
            <div class="rev-field">
                <div class="rev-info"><span>Boost</span><span id="b-val">1.0x</span></div>
                <input type="range" id="r-boost" class="rev-range" min="1" max="5" step="0.1" value="1">
            </div>

            <div class="rev-field">
                <div class="rev-info"><span>Gain</span><span id="g-val">100%</span></div>
                <input type="range" id="r-gain" class="rev-range" min="0" max="2" step="0.05" value="1">
            </div>

            <div class="rev-field">
                <div class="rev-info"><span>Stereo</span><span id="s-val">Ctr</span></div>
                <input type="range" id="r-stereo" class="rev-range" min="-1" max="1" step="0.1" value="0">
            </div>

            <div id="rev-status-btn">Inactive</div>
        `;
        document.body.appendChild(hud);

        // --- Audio Hook Logic ---
        let audioCtx, sourceNode, gainNode, stereoNode, active = false;

        document.getElementById('rev-status-btn').addEventListener('click', () => {
            if (active) return;
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const nativeGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                
                navigator.mediaDevices.getUserMedia = async (constraints) => {
                    const stream = await nativeGUM(constraints);
                    if (stream.getAudioTracks().length > 0 && audioCtx) {
                        try {
                            sourceNode = audioCtx.createMediaStreamSource(stream);
                            gainNode = audioCtx.createGain();
                            stereoNode = window.StereoPannerNode ? new StereoPannerNode(audioCtx) : audioCtx.createGain();

                            sourceNode.connect(gainNode);
                            gainNode.connect(stereoNode);

                            const dest = audioCtx.createMediaStreamDestination();
                            stereoNode.connect(dest);

                            const processedTrack = dest.stream.getAudioTracks()[0];
                            stream.removeTrack(stream.getAudioTracks()[0]);
                            stream.addTrack(processedTrack);
                        } catch (err) {
                            console.error(err);
                        }
                    }
                    return stream;
                };

                active = true;
                const btn = document.getElementById('rev-status-btn');
                btn.innerText = "Active";
                btn.style.background = "rgba(40, 180, 80, 0.2)";
                if (audioCtx.state === 'suspended') audioCtx.resume();
            } catch (e) {
                console.error(e);
            }
        });

        // --- Controls Handler ---
        document.getElementById('r-boost').addEventListener('input', (e) => {
            const val = e.target.value;
            document.getElementById('b-val').innerText = val + 'x';
            if (gainNode && audioCtx) gainNode.gain.setValueAtTime(parseFloat(val), audioCtx.currentTime);
        });

        document.getElementById('r-gain').addEventListener('input', (e) => {
            const val = e.target.value;
            document.getElementById('g-val').innerText = Math.round(val * 100) + '%';
        });

        document.getElementById('r-stereo').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            let txt = 'Ctr';
            if (val < 0) txt = 'L' + Math.abs(Math.round(val * 100));
            if (val > 0) txt = 'R' + Math.round(val * 100);
            document.getElementById('s-val').innerText = txt;

            if (stereoNode && stereoNode.pan && audioCtx) {
                stereoNode.pan.setValueAtTime(val, audioCtx.currentTime);
            }
        });
    },

    onUnload() {
        const hud = document.getElementById('rev-vertical-hud');
        if (hud) hud.remove();
    }
};
