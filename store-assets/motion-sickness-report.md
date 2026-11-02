# FeedWell: motion cues report (1.20.1)

What the motion sickness feature should be, what the other apps and the research say, and what
1.20.1 does. Written 2 November 2026.

## The question

You use KineStop and find it better than FeedWell's dots: more dots, smoother, quicker to react,
and half of the screen tinted. You asked for a deep look at what the best solution is, rather
than copying KineStop.

## What FeedWell 1.20.0 did

`src/components/KinetosisOverlay.js`, shown when Reduce Motion (Kinetosis) is on:

- 8 dots, fixed positions near the edges, all moving together by at most 30 px.
- They followed the **gyroscope**, which measures how the phone turns in the hand. A car
  braking or speeding up doesn't turn the phone, so the dots didn't move for the very motion
  that makes people sick. Tilting the phone did move them.
- Each sensor reading (60 a second) stopped the running animation and started a new spring from
  JavaScript. When the app was busy (a refresh, a long list), the dots lagged and jumped.
- The positions came from the screen size at launch, so they were wrong after a rotation.
- The setting's description said "a fixed dot", which is also what semo-lab.com/feedwell says.

## What the others do

| | Apple Vehicle Motion Cues | Google Motion Assist | KineStop |
|---|---|---|---|
| Since | iOS 18 (2024), Mac with macOS 26 | Android 17 with Play services, rolled out Sept 2026 (Pixel, Galaxy Fold 8) | Android 7 and later, an app |
| What it shows | Dots along the left and right edges | "Small, subtle visual bubbles along your screen edges", two columns a side | Dots and an artificial horizon |
| Where | Over everything | Over everything | Over everything (an overlay, and an accessibility service for the status bar) |
| Starts | On, Off or Automatic (in a vehicle) | Manual tile, or "Start in a moving vehicle" | Manual, or automatic with activity recognition |
| Options | Pattern Regular or Dynamic, color, larger or more dots (iOS 26) | Color, shape, opacity, randomization | Themes, colors, a maximum horizon angle |

Neither Apple nor Google publishes how the dots respond. Reports agree that a turn moves them
sideways, opposite to the turn; reports disagree about braking. Google's feature reaches only
phones with Android 17, so most FeedWell readers (the Doogee runs Android 12) don't have it.

## What the research says

The accepted cause is a conflict between what the eyes see (a still screen) and what the inner
ear feels (the vehicle's pushes). The useful findings for a reading app:

- **MotionReader** (Purdue, 26 riders on a city bus, view limited to the tablet): moving the text
  against the acceleration ("text inertia") gave the lowest sickness scores (0.29 against 0.34
  without a cue). A ball on a spring beside the text made it worse (0.38): it took room,
  pulled the eye, and its lag was visible. Small study, no significance claimed. They ignored
  the push toward and away from the screen, and used 0.1 g as the smallest push shown.
- **Review of visual cues in cars** (Emond, Bohrmann, Zare, *Ergonomics* 2024): cues help in
  some setups, and every kind worked better in peripheral vision than in the center.
- **Meta-analysis of motion sickness in vehicles** (*Transportation Research F*, 2023): the
  outside view and cues you hear or feel ahead of time help reliably; artificial visual cues
  give mixed results.
- **Bubble Margin** (Salzburg, 2019): bubbles in the margins of a phone that move with the
  car. 10 people in real driving, most felt better. The closest study to Apple's design, and
  very small.
- **Artificial horizon**: in a ship-motion simulator, 30 susceptible people had lower peak
  sickness with a projected horizon (9.83 to 7.23, p < 0.03). Head-worn horizons helped some
  patients but distracted pilots, and one researcher says the idea "has never worked". No study
  tested a tinted half screen while reading on a phone.
- **Latency**: MotionReader and a Pixel owner's report on Motion Assist both point at lag or a
  mismatch as what makes a cue backfire.

So the evidence is modest and small-scale, but it agrees on four rules:

1. The cue moves the way the body is pushed, at once.
2. It moves smoothly, without visible lag or jitter.
3. It lives at the edges, in peripheral vision.
4. It leaves the text alone and doesn't pull the eye.

KineStop's "more dots, smoother, quicker" fits rules 1 and 2. Its tinted half screen fits the
horizon research, but it breaks rule 4, and nobody has tested it for reading.

## What 1.20.1 does

The dots are now a native Android view (`android/app/src/main/java/com/feedwell/app/MotionCuesView.kt`).
The sensors and the drawing run at the screen's frame rate; nothing waits for JavaScript.

They draw on a surface of their own above FeedWell's window. The first build drew them in the
window itself, and every move of a dot made Android redraw the whole screen, the background wash
included: 34 ms a frame on the Doogee, so about 30 frames a second, and sensor noise kept it
redrawing even on a table (605 frames in 10 seconds). On their own surface, the app below never
redraws for them, and a still phone draws nothing: 0 frames in 10 seconds, app and dots alike.

**The signal.** Android's fused sensors (gyroscope and accelerometer together) give the
acceleration with gravity taken out. FeedWell keeps the horizontal part and splits it into across
the screen and forward, using how the phone is held: forward is where the screen's top points and
where the back of the phone faces. Braking moves the dots whether the phone is held upright,
tilted or flat. MotionReader lost that for a phone held upright. A slow average removes the
sensor's own drift.

**The direction.** The dots act as if they had weight: braking slides them up the screen
(forward), speeding up slides them down, and a turn slides them to the outside, which is where the
body is pushed. They spring back when the push ends.

**The motion.**
- Sensors at 100 readings a second.
- A spring at 1.6 Hz, a little under critical damping, so the dots follow within about 0.15 s.
  The spring smooths hand shake and road buzz (well above 2 Hz) but keeps the car's motion.
  Car sickness comes mostly from motion around 0.1 to 0.5 Hz.
- Pushes under 0.12 m/s² are ignored, so the dots don't jitter. MotionReader used 0.1 g, about
  1 m/s², which hides most gentle driving.
- Each m/s² moves the dots 16 dp. A soft limit keeps them near the edges: 30 dp across, 44 dp
  up and down.

**The dots.**
- Two columns on each side, a row every 44 dp: about 70 dots on a phone, against 8 before.
- The inner column sits half a row lower, so the dots form a lattice.
- The inner column moves three quarters as far, which gives a little depth.
- They run the full height and wrap around as they move, so no gap opens.
- Color: the text color at 42% (dark) or 32% (light).

**Dimming.** The dots are at full strength while the vehicle moves. After 8 seconds of stillness
they fade to a third, so at a desk they barely show. They come back as soon as the vehicle moves.

**Horizon, as a choice.** Settings, Reading, Motion cues: **Dots** (the default) or **Dots and
horizon**.
- The horizon is a light tint of the accent color over the lower part of the screen.
- Its surface stays level with what the body feels as down, gravity and the vehicle's push
  together, like water in a glass.
- It tilts in a turn, stays level when you tilt the phone in your hand, rises when the vehicle
  brakes and sinks when it speeds up.
- It fades out when the phone lies flat, where it has no meaning.

It's there for you to compare with KineStop in a real ride. It isn't the default because it
covers text and no study supports it for reading.

**Battery.** The sensors run only while FeedWell is on screen with the setting on. Nothing runs
in the background.

**Web.** The browser build keeps the old dots: phones' browsers ask permission for motion
sensors, and desktops have none.

## Not done, and why

- **Automatic start in a vehicle**: needs Google's activity recognition and a new permission. The
  dimming covers most of the need: the cues are faint until the vehicle moves.
- **Over other apps**: FeedWell's cues show only in FeedWell. On Android 17 phones, Motion
  Assist does this system-wide, and running both doubles the dots.
- **Color, size and number of dots**: Apple and Google offer them. Easy to add if you want them
  after the ride test, but each is a new setting in 30 languages.
- **Cues that come before the motion** work better in studies, but need the route or the car's
  data, which a phone app doesn't have.

## Checked so far

On the Doogee, 1.20.1 (145):
- The dots draw in two columns a side, soft gray in dark mode, and touches pass through them
  (the Settings choices under them work).
- Android's fused gravity and linear acceleration sensors run at 100 a second while FeedWell is
  on screen with the setting on.
- With the phone still, nothing redraws, and after 8 seconds the dots dim to a third (measured
  on screen).
- You moved the phone: "very smooth", and the horizon shows in the hand and goes away on the
  table, as designed.
- The first build had two faults, both fixed before the release: the colors were converted
  twice (the dots and horizon came out teal, the horizon at about 60%), and the whole screen
  redrew for every move (above).

Not yet tried in a moving car. This needs you: a ride of 15 minutes or more, reading, once with
Dots and once with Dots and horizon, ideally on the same route as a KineStop ride.

## Other places to update

- semo-lab.com/feedwell says "a fixed focus dot".
- Play screenshot 8 ("Kind to motion sickness"): retaken on 1.20.1 with Dots and horizon, your
  choice, the phone standing so the horizon shows. Caption: "Dots at the screen's edges move
  with the vehicle, so your eyes see what your body feels."
- The screenshot tool: uiautomator reads the screen normally with the dots on (they're on their
  own surface and aren't in the view tree), so the shot can tap by text again.

## Sources

- Apple: [Vehicle Motion Cues settings and options](https://mcmw.abilitynet.org.uk/how-to-reduce-motion-sickness-whilst-using-your-iphone-or-ipad-when-travelling-in-a-moving-vehicle-in-ios-18), [Mac Observer on how the dots move](https://www.macobserver.com/ios/vehicle-motion-cues-iphone/)
- Google: [Use motion assist (Android Help)](https://support.google.com/android/answer/18105165?hl=en), [9to5Google on the rollout](https://9to5google.com/2026/09/14/android-motion-assist-pixel-samsung/)
- KineStop: [Google Play](https://play.google.com/store/apps/details?id=com.urbandroid.kinestop), [Android Authority](https://www.androidauthority.com/reduce-motion-sickness-android-3465907/)
- Open-source overlay: [Motion Cues on F-Droid](https://f-droid.org/en/packages/dev.davidv.motionsickness/)
- [MotionReader: Visual Acceleration Cues for Alleviating Passenger E-Reader Motion Sickness](https://www.cs.purdue.edu/xrlab/assets/pdf/popescuMR_AUI17.pdf)
- [Emond, Bohrmann, Zare: Will visual cues help alleviating motion sickness in automated cars? (Ergonomics)](https://pubmed.ncbi.nlm.nih.gov/37981841/)
- [Inducers of motion sickness in vehicles: systematic review and meta-analysis](https://www.sciencedirect.com/science/article/abs/pii/S1369847823002127)
- [Bubble Margin (INTERACT 2019)](https://www.researchgate.net/publication/335379309_Bubble_Margin_Motion_Sickness_Prevention_While_Reading_on_Smartphones_in_Vehicles)
- [Artificial horizon effects on motion sickness and performance](https://cris.haifa.ac.il/en/publications/artificial-horizon-effects-on-motion-sickness-and-performance/)
- [MOSI app, simulator and real-vehicle study](https://www.researchgate.net/publication/381141867_Can_we_Use_Smart_Phone_on_a_Moving_Vehicle_Without_Worrying_About_Carsickness_Developing_an_Effective_Motion_Cue_APP_with_Driving_Simulator_and_Real_Vehicle_Experiments)
