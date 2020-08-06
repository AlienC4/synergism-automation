/*
Script written by Galefury.
This is an automation script for the idle game Synergism, made by Platonic, playable at https://pseudonian.github.io/SynergismOfficial/
I haven't tested it on the release version, so most likely it only works in 1.011 beta, playable at https://v1011testing.vercel.app/
Feel free to use the script, distribute it and do whatever you want with it, just don't come crying to me if it does something you don't want, like breaking your save or crashing your browser.
If you distribute it, edited or unedited, please include a link to the original version repo: https://github.com/Galefury/synergism-automation (or just fork the repo on github, that's clear enough as well)

EXPORT YOUR SAVE BEFORE USING!!!

Note that some (or all) features of this script may be seen as cheating by some people, especially features that directly emulate ingame upgrades.
So when bragging about your achievements you should probably mention that you used a script to do them, to be fair to players who did it all manually.
I've tried to only use functions that are also directly called by pressing buttons with the same arguments, so hopefully the script will not do anything that the player cant do.
But sometimes buttons are hidden but the functions still work, so there is no guarantee that the script will not cheat (e.g. in my tests the script bought some talismans I hadn't unlocked yet...)
Press F12 and paste the script into the Javascript console to use it. Refresh the page or use window.clearInterval(###Interval ID returned after copypaste here###) to get rid of it.
There is some logging enabled by default, which will show up in the JS console.
Make a copy of the script and change the settings (everything starting with scriptSettings) to make some simple changes to script behaviour.
For other changes you will have to edit the actual script code.

Feel free to ping me with suggestions for improvements to the script on the Synergism Discord. As long as I think they will actually be an improvement and not much work I might put them in.
As I am not an experienced javascript developer I'm especially interested in suggestions regarding the script architecture and taking advantage of neat Javascript features. I haven't used classes so far because it seemed overkill.
I am also interested in feedback about how efficient the script is compared to decent manual playing.
I'll most likely merge useful pull requests as long as I am playing the game and using and improving the script.
Please do not ping me with questions about how the script works unless you did some reasonable effort on understanding it yourself.

Since it is public now I will most likely add some convenience features like Tampermonkey comments and some sort of GUI if I can. For now this is all still a work in progress and fairly incomplete.
It can run an ascension from start to finish if you have row 1 of cube upgrades.
*/

/*
Changelog
1.4    Fixes for new game version
- Game version: v1.011 TESTING! Update: August 6, 2020 12:12 AM PDT
- Default rune caps set to 5000
- Direct checks of rune level adjusted to 4 times the old value
- Challenge check moved down so it doesn't block other things

1.3    Added auto cube opener and particle building autobuyer
- Added this changelog
- Log lists sum of cube blessings now
- Added very simple auto cube opener (opens all cubes every second). Turned off by default.
- Added Particle building autobuyer. Turned off by default.
- Added comments to settings
- Lowered default wait time for transcension and reincarnation challenges

1.2    Cube upgrade 3x8 in challenge pushes
Merged a change by AlienC4 to improve challenge pushes with cube upgrade 3x8

1.1    Community feedback
Incorporated feedback from AlienC4 and Xander374
- Adjusted default rune weights
- Periodic status log lists highest challenge completions now, and lists all talismans
- Reincarnation counter capped to 60000
- Wait a little to enter challenges after ascension to gain a few particles first
- Ascend sooner (check moved up and condition softened)
- Fix indentation

1.0    Initial version
Initial version of the script. Game version: v1.011 TESTING! Update: July 22, 2020 7:45 PM PDT
*/

/*
TODO:
- Handle 3x8 (gain parts without reincarnation)
- Auto Research for pre-roomba?
- Move settings to browser storage
- Tampermonkey stuff for automatic script loading
- Refactor into a looping function to simplify variable names without risking naming conflicts and get rid of the window.setInterval
- Settings and dashboard GUI
*/

let scriptSettings = {};

// General Script settings
scriptSettings.autoTurnedOn = true;
scriptSettings.scriptInterval = 1000;

// Toggles for Script features
scriptSettings.autoLog            = true;  // Does some periodic logging, as long as logLevel is at least 2
scriptSettings.autoGameFlow       = true;  // Reincarnate, Ascend, do challenges, respec runes
scriptSettings.autoTalismans      = true;  // Automatically enhances and fortifies talismans and buys Mortuus ant
scriptSettings.autoChallengeTrans = true;  // Runs Trans challenges, but only if triggered manually or by autoGameFlow
scriptSettings.autoChallengeReinc = true;  // Runs Reinc challenges, but only if triggered manually or by autoGameFlow
scriptSettings.autoRunes          = true;  // Automatically levels runes. Saves offerings just before getting some techs and at ant timer < 10 minutes
scriptSettings.autoReincUpgrades  = true;  // Automatically buys Particle upgrades
scriptSettings.autoOpenCubes      = false; // Automatically opens all cubes
scriptSettings.autoPartBuildings  = false; // Automatically buy particle buildings every script interval. For when you don't have c1x7 to c1x9 yet.

// Logging Settings
scriptSettings.logLevel = 10; // How much to log. 10 prints all messages, 0 logs only script start.
scriptSettings.logInterval = 300; // Logs some general game data to console every X seconds. Logging level needs to be at least 2 for this to work.

// Game flow settings
scriptSettings.flowReincChallengePartMulti = 1.1; // Start reincarnation challenges only if particle exponent has multiplied at least this much since last time (or since script start)
scriptSettings.flowReincChallengePartPlus = 1000; // ... if it increased by this much
scriptSettings.flowMinTimeBetweenReincChallenges = 60; // Minimum Ascension Counter (= realtime) between Reinc challenges
scriptSettings.flowTransChallengePartMulti = 1.1; // Same as above but for Trans challenges
scriptSettings.flowTransChallengePartPlus = 1000; // Same
scriptSettings.flowMinTimeBetweenTransChallenges = 60; // Same
// false: Do a challenge push with rune respec only if Talisman levels have changed, or when talismans are maxed push when ant levels have changed enough.
// true: Keep pushing if ant levels change enough, even when talismans are not maxed
scriptSettings.flowKeepPushingWithoutMaxedTalis = true;
scriptSettings.flowPushAntChange = 300; // How much the sum of ant generator levels (excluding first one) needs to change to start another push
scriptSettings.flowAscendAtC10Completions = 1; // Ascend only if C10 has been completed at least this many times

// Talisman settings
scriptSettings.talismanInterval = 10000; // How often to buy Talismans. Interval in Milliseconds.
scriptSettings.talismansEnhance = [1, 2, 3, 4, 6]; // Which talismans to enhance. All talismans are fortified.

// Auto Trans Challenge settings
scriptSettings.maxTransChallengeDuration = 5; // How long to wait for completion of trans challenges (trans counter)

// Auto Reinc Challenge settings
scriptSettings.maxReincChallengeDuration = 30; // How long to wait for completion of reinc challenges (reinc counter)

// Auto Runes settings
scriptSettings.runeCaps = [5000, 5000, 5000, 5000, 5000]; // Put your rune caps here, or put to what level you want the rune auto levelled (might go a bit higher)
scriptSettings.runeWeights = [1, 2, 1, 3, 4]; // Weights for how many offerings to put into each rune

// Variables, don't change manually
let scriptVariables = {};
scriptVariables.talismanCounter = 0;
scriptVariables.currentTransChallenge = -1;
scriptVariables.currentReincChallenge = -1;
scriptVariables.targetReincTime = 600000;
scriptVariables.saveOfferingsForRespecs = false; //A
scriptVariables.currentAction = ""; //A
scriptVariables.actionStep = -1; //A
scriptVariables.pushLastTalismanSum = player.talismanRarity.reduce( (sum, current) => sum + current, 0 ); //A
scriptVariables.pushLastAntSum = scriptCalculateAntSum(false); //A
scriptVariables.lastReincChallengeParts = player.reincarnationPoints.exponent; //A
scriptVariables.lastReincChallengeCounter = player.ascensionCounter; //A
scriptVariables.lastTransChallengeParts = player.reincarnationPoints.exponent; //A
scriptVariables.lastTransChallengeCounter = player.ascensionCounter; //A
scriptVariables.autoRunesWaitForTech = 0; //A
scriptVariables.hasUpgrade3x8 = player.cubeUpgrades[28] > 0
// checks if Talismans 1 is 1 3 5
scriptVariables.ascensionBlessingRespecDone = player.talismanOne.reduce(((result,value,index)=>{let checkArray = [null, 1, -1, 1, -1, 1]; return value === checkArray[index] && result;}), true); //A
scriptVariables.lastLogCounter = 0; //A

// General Helper functions
function sLog(level, text) {
  if (level <= scriptSettings.logLevel) {
    let d = new Date();
    console.log(d.toLocaleTimeString() + " " + Math.floor(player.reincarnationPoints.exponent) + "   " + text);
  }
}

// Logs stuff periodically
function scriptLogStuff() {
  sLog(2, "=== Info Dump at Ascension timer " + Math.floor(player.ascensionCounter) + " ===");

  // Logs Challenge completions
  sLog(2, "Challenge Info: " +
  "Trans: " + player.highestchallengecompletions.one+"/"+player.highestchallengecompletions.two+"/"+player.highestchallengecompletions.three+"/"+player.highestchallengecompletions.four+"/"+
  player.highestchallengecompletions.five+"  "+
  "Reinc: " + player.highestchallengecompletions.six+"/"+player.highestchallengecompletions.seven+"/"+player.highestchallengecompletions.eight+"/"+player.highestchallengecompletions.nine+"/"+
  player.highestchallengecompletions.ten);
  // Logs Rune Levels, Talisman Rarity, Talisman levels
  sLog(2, "Rune Info:      " +
  "R: " + player.runelevels[0]+"/"+player.runelevels[1]+"/"+player.runelevels[2]+"/"+player.runelevels[3]+"/"+player.runelevels[4]+"   "+
  "T: " + player.talismanRarity[1] + "x" + player.talismanLevels[1] + "/" +
  player.talismanRarity[2] + "x" + player.talismanLevels[2] + "/" +
  player.talismanRarity[3] + "x" + player.talismanLevels[3] + "/" +
  player.talismanRarity[4] + "x" + player.talismanLevels[4] + "/" +
  player.talismanRarity[5] + "x" + player.talismanLevels[5] + "/" +
  player.talismanRarity[6] + "x" + player.talismanLevels[6] + "/" +
  player.talismanRarity[7] + "x" + player.talismanLevels[7]
  );

  // Logs some Cube stats
  let c = player.cubesThisAscension.challenges, r = player.cubesThisAscension.reincarnation, a = player.cubesThisAscension.ascension;
  sLog(2, "Cube Info:      " + (format((c + r + a) / player.ascensionCounter, 4, true)) + "C/s   current: " + Math.floor(player.wowCubes) + "   blessings: " + Object.values(player.cubeBlessings).reduce((s, t) => s + t));
}

function scriptAutoLog() {
  if (player.ascensionCounter > scriptVariables.lastLogCounter + scriptSettings.logInterval) {
    scriptVariables.lastLogCounter = player.ascensionCounter;
    scriptLogStuff();
  }
}

// Game Flow helper functions
function scriptCheckTalismansMaxed() {
  for (let i = 0; i < scriptSettings.talismansEnhance.length; i++) {
    if (player.talismanRarity[scriptSettings.talismansEnhance[i]] < 6) return false;
  }
  return true;
}

function scriptCalculateAntSum(includeFirst) {
  let antSum = includeFirst ? player.firstOwnedAnts : 0;
  return antSum + player.secondOwnedAnts + player.thirdOwnedAnts + player.fourthOwnedAnts + player.fifthOwnedAnts + player.sixthOwnedAnts
                                         + player.seventhOwnedAnts + player.eighthOwnedAnts;
}

function scriptSetAutoSac(autosac) {
  if (player.autoAntSacrifice != autosac) toggleAntAutoSacrifice();
}

function scriptNoCurrentAction() {
  return (scriptVariables.currentAction === "" && scriptVariables.currentTransChallenge < 0 && scriptVariables.currentReincChallenge < 0);
}

// Handles the Game flow, starting challenges, respeccing talismans, reincarnating early, and so on. Does not ascend.
function scriptAutoGameFlow () {
  let maxTalismanBonus = Math.max(window.rune1Talisman, window.rune2Talisman, window.rune3Talisman, window.rune4Talisman, window.rune5Talisman);

  // Determine desired reincarnation time
  // TODO: Determine if > 60s is needed
  if (player.upgrades[70] < 1) scriptVariables.targetReincTime = 30; // If you don't have the e22 particle upgrade, reincarnate every 30s to keep max obt up to date
  else if (player.reincarnationPoints.exponent < 10000) scriptVariables.targetReincTime = 60;  // With the e22 particle upgrade but low particles, reincarnate every 60s to keep max obt fairly decent and quickly boost particles
  else scriptVariables.targetReincTime = 60000; // Auto Reincarnation should be on and set to 4440, if not reincarnate after a long time

  // Turn Ant Sacrifice back on if doing nothing
  if (scriptNoCurrentAction()) scriptSetAutoSac(true);

  // Start saving 800k offerings for respecs once prism goes above 850
  // Once it is on it stays on
  scriptVariables.saveOfferingsForRespecs = scriptVariables.saveOfferingsForRespecs || ((player.runelevels[2] + maxTalismanBonus + bonusant9 + player.antUpgrades[9]) > 850*4);
  // see around line 500 in updatehtml.js 'if (currentTab == "runes"' for bonus level calc

  // Do Talisman respec for blessings once prism can go above 1050
  if (scriptNoCurrentAction() && !scriptVariables.ascensionBlessingRespecDone && (player.runelevels[2] + maxTalismanBonus + bonusant9 + player.antUpgrades[9]) > 1050*4 && player.runeshards > 400000) {
    mirrorTalismanStats = [null, 1, -1, 1, -1, 1]; //Respec to 1 3 5
    respecTalismanConfirm(8);
    scriptVariables.ascensionBlessingRespecDone = true;
    sLog(2, "Respecced Talismans to 135 for blessings");
  }

  // Handle Ascension
  // If target number of C10 completions is reached, ascend. This is going to be right after a challenge push, so it is not necessary to do another.
  // Needed Shards are at 800k to match up with the push condition. The script will push until it no longer can significantly boost ants by it, then ascend.
  // Step 1: Respec Talismans, Ascend, reset Variables
  // Step 2: maybe some initial stuff, for now no further steps
  if (scriptNoCurrentAction() && player.challengecompletions["ten"] >= scriptSettings.flowAscendAtC10Completions && player.runeshards > 400000) {
    sLog(2, "Ascending with " + player.challengecompletions.ten + " C10 completions after " + player.ascensionCounter + " seconds");

    if (scriptSettings.autoLog) scriptLogStuff();

    // Respec to 2 4 5
    mirrorTalismanStats = [null, -1, 1, -1, 1, 1];
    respecTalismanConfirm(8);

    // Ascend
    reset(4); // to skip confirmation, usually it should be resetCheck('ascend')
    scriptSetAutoSac(true);

    // reset script variables
    scriptVariables.saveOfferingsForRespecs = false; //A
    scriptVariables.pushLastTalismanSum = player.talismanRarity.reduce( (sum, current) => sum + current, 0 ); //A
    scriptVariables.pushLastAntSum = scriptCalculateAntSum(false); //A
    scriptVariables.lastReincChallengeParts = 0; //A
    scriptVariables.lastTransChallengeParts = 0; //A
    scriptVariables.autoRunesWaitForTech = 0; //A
    scriptVariables.ascensionBlessingRespecDone = false;
    scriptVariables.lastTransChallengeCounter = -1000;
    scriptVariables.lastReincChallengeCounter = 0;
    scriptVariables.lastLogCounter = 0;
    scriptVariables.hasUpgrade3x8 = player.cubeUpgrades[28] > 0

    scriptVariables.currentAction = ""; //A
    scriptVariables.actionStep = -1; //A

    sLog(1, "Ascended");
  }

  // Handle doing challenges occasionally (before blessings)
  if (scriptNoCurrentAction() && (!scriptVariables.ascensionBlessingRespecDone || player.challengecompletions["nine"] === 0) && player.ascensionCounter > 30) {
    // Do Reincarnation Challenges if particles have changed significantly
    if (scriptVariables.lastReincChallengeCounter + scriptSettings.flowMinTimeBetweenReincChallenges < player.ascensionCounter && scriptVariables.currentTransChallenge < 0
    && (player.reincarnationPoints.exponent > scriptVariables.lastReincChallengeParts * scriptSettings.flowReincChallengePartMulti || player.reincarnationPoints.exponent > scriptVariables.lastReincChallengeParts + scriptSettings.flowReincChallengePartPlus)) {
      scriptVariables.lastReincChallengeParts = player.reincarnationPoints.exponent;
      scriptVariables.lastReincChallengeCounter = player.ascensionCounter;
      scriptVariables.currentReincChallenge = 0;
      sLog(6, "Started Reinc Challenges");
    }
    // Do Transcension Challenges if particles have changed significantly
    // TODO: Maybe additional triggers would be useful (rune/talisman changes)
    if (scriptVariables.lastTransChallengeCounter + scriptSettings.flowMinTimeBetweenTransChallenges < player.ascensionCounter && scriptVariables.currentReincChallenge < 0
    && (player.reincarnationPoints.exponent > scriptVariables.lastTransChallengeParts * scriptSettings.flowTransChallengePartMulti || player.reincarnationPoints.exponent > scriptVariables.lastTransChallengeParts + scriptSettings.flowTransChallengePartPlus)) {
      scriptVariables.lastTransChallengeParts = player.reincarnationPoints.exponent;
      scriptVariables.lastTransChallengeCounter = player.ascensionCounter;
      scriptVariables.currentTransChallenge = 0;
      sLog(6, "Started Trans Challenges");
    }
  }

  // Handle particle/challenge pushes
  // If more than 800k offerings are available
  // ... and talisman levels are above some threshold (first orange) and changed since last time
  //    ... or all autoenhance talismans are maxed and ant levels have changed significantly since last time
  // Do a particle and challenge push!
  // Respec into 1 2 4 immediately and turn off autosac, update last push ant level, then do the following steps once the conditions are met
  // 1. Reincarnate after 30 ingame seconds
  // 2. Reincarnate again after 30 ingame seconds
  // 3. Do Trans challenges after 30 ingame seconds
  // 4. Once those are done, do Reinc challenges
  // 5. Reincarnate immediately once Reinc challenges are done
  // 6. Reincarnate again after 30s
  // 7. Reincarnate again after 60s
  // 8. Reincarnate again after 60s, update last push ant level again, and respec back to 1 3 5
  // 9. Wait 60 ingame seconds, turn ant sacrifice back on
  if (scriptNoCurrentAction() && player.runeshards > 800000 && player.talismanRarity[1] >=5 && player.antSacrificeTimer > 300 &&
      (scriptVariables.pushLastTalismanSum == null
      || scriptVariables.pushLastTalismanSum < player.talismanRarity.reduce( (sum, current) => sum + current, 0 )
      || ((scriptSettings.flowKeepPushingWithoutMaxedTalis || scriptCheckTalismansMaxed()) && scriptCalculateAntSum(false) - scriptVariables.pushLastAntSum > scriptSettings.flowPushAntChange))) {
    // Start a push
    scriptVariables.pushLastTalismanSum = player.talismanRarity.reduce( (sum, current) => sum + current, 0 );
    scriptVariables.pushLastAntSum = scriptCalculateAntSum(false);
    scriptVariables.currentAction = "push";
    scriptVariables.actionStep = 1;

    scriptSetAutoSac(false);
    mirrorTalismanStats = [null, 1, 1, -1, 1, -1]; //Respec to 1 2 4
    respecTalismanConfirm(8);
    scriptVariables.pushLastReincTimer = player.reincarnationcounter;
    sLog(4, "Started a challenge push");
  }
  // Step 1: Reincarnate
  if (scriptVariables.currentAction === "push" && (scriptVariables.actionStep === 1) &&
      (player.reincarnationcounter > scriptVariables.pushLastReincTimer + 30 ||
          player.reincarnationcounter < scriptVariables.pushLastReincTimer ||
          scriptVariables.hasUpgrade3x8)) {
    // Reincarnate
    if (!scriptVariables.hasUpgrade3x8) resetCheck('reincarnate');
    scriptVariables.actionStep++;
  }
  // Step 2, 6 and 7: Reincarnate
  if (scriptVariables.currentAction === "push" && (scriptVariables.actionStep === 2 || scriptVariables.actionStep === 6 || scriptVariables.actionStep === 7) &&
      (player.reincarnationcounter > (scriptVariables.actionStep === 7 ? 60 : 30))) {
    // Reincarnate
    if (!scriptVariables.hasUpgrade3x8) resetCheck('reincarnate');
    scriptVariables.actionStep++;
  }
  // Step 3: Start Trans Challenges
  if (scriptVariables.currentAction === "push" && scriptVariables.actionStep === 3 &&
      (player.reincarnationcounter > 30)) {
    scriptVariables.currentTransChallenge = 0;
    scriptVariables.actionStep++;
  }
  // Step 4: Start Reinc Challenges
  if (scriptVariables.currentAction === "push" && scriptVariables.actionStep === 4 &&
      (scriptVariables.currentTransChallenge === -1)) {
    scriptVariables.currentReincChallenge = 0;
    scriptVariables.actionStep++;
  }
  // Step 5: Reincarnate
  if (scriptVariables.currentAction === "push" && scriptVariables.actionStep === 5 &&
      (scriptVariables.currentReincChallenge === -1)) {
    resetCheck('reincarnate');
    scriptVariables.actionStep++;
  }
  // Step 8: Reincarnate and Respec
  if (scriptVariables.currentAction === "push" && scriptVariables.actionStep === 8 &&
      ((player.reincarnationcounter > 60 || scriptVariables.hasUpgrade3x8) && player.runeshards > 400000)) {
    if (!scriptVariables.hasUpgrade3x8) resetCheck('reincarnate');
    scriptVariables.pushLastAntSum = scriptCalculateAntSum(false);
    mirrorTalismanStats = [null, 1, -1, 1, -1, 1]; //Respec to 1 3 5
    respecTalismanConfirm(8);
    scriptVariables.actionStep++;
  }
  // Step 9: Turn Autosac back on, cleanup
  if (scriptVariables.currentAction === "push" && scriptVariables.actionStep === 9 &&
      (player.reincarnationcounter > 60)) {
    scriptSetAutoSac(true);
    scriptVariables.currentAction = "";
    scriptVariables.actionStep = -1;
  }

  // Handle Reincarnation
  if (scriptNoCurrentAction() && (player.reincarnationcounter > scriptVariables.targetReincTime || ((player.reincarnationPoints.exponent + 100)*1.05 < reincarnationPointGain.exponent && player.reincarnationcounter > 60))) {
    let tempTimer = player.reincarnationcounter;
    resetCheck('reincarnate');
    sLog(8, "Reincarnated (" + tempTimer + ")");
  }
}

// Automatically levels and enhances talismans (only the ones set in settings are enhanced)
function scriptAutoTalismans () {
  if (!(player.challengecompletions.nine > 0.5)) return; // Don't try this if talismans are not available

  // Only act every talismanInterval
  scriptVariables.talismanCounter += scriptSettings.scriptInterval;
  if (scriptVariables.talismanCounter < scriptSettings.talismanInterval) return;
  scriptVariables.talismanCounter = 0;

  let unlockAchievements = [null, 119, 126, 133, 140, 147, null, null];

  // Autobuy Mortuus Est
  buyAntUpgrade('1e100',true,12);

  // Autobuy Shards and White Fragments if less than 1e8, and buying for 10% of obt will give more than twice the amount already available
  if (player.talismanShards < 1e8 && 2 * player.talismanShards < player.researchPoints/1e7) {
    toggleTalismanBuy(10);
    buyTalismanStuff(0);
  }
  if (player.commonFragments < 1e8 && 2 * player.commonFragments < player.researchPoints/3e7) {
    toggleTalismanBuy(10);
    buyTalismanStuff(1);
  }

  for (let i = 1; i < 8; i++) {
    // Check if Talisman is unlocked
	  if (i >= 1 && i <= 5) {
	    if (!(player.achievements[unlockAchievements[i]] === 1)) continue;
	  } else if (i === 6) {
	    if (!player.antUpgrades[12] > 0) continue;
	  } else if (i === 7) {
	    if (!player.shopUpgrades.talismanBought) continue;
	  }

	  if (scriptSettings.talismansEnhance.includes(i)) {
	    buyTalismanEnhance(i);
	  }
	  buyTalismanLevels(i);
  }
}

// Automatically enters Transcension challenges, exits after they start taking too long, and moves to the next one
// Set scriptVariables.currentTransChallenge to 0 to start
function scriptAutoChallengeTrans() {
  if (scriptVariables.currentTransChallenge < 0) return;
  let ordinals = [null,'one','two','three','four','five','six','seven','eight','nine','ten']

  if (!player.retrychallenges) toggleRetryChallenges();

  if (scriptVariables.currentTransChallenge === 0) {
    scriptVariables.previousAutoSac = player.autoAntSacrifice;
    scriptSetAutoSac(false);
  }

  // move to next challenge if the current one is taking too long, and stop challenging after c5 is done
  if (player.currentChallenge == "" || (player.currentChallenge == ordinals[scriptVariables.currentTransChallenge] && player.transcendcounter > scriptSettings.maxTransChallengeDuration)) {
    if (player.currentChallenge != "") resetCheck('challenge');
    if (scriptVariables.currentTransChallenge < 5) {
      scriptVariables.currentTransChallenge++;
    }
    else {
      scriptVariables.currentTransChallenge = -1;
      scriptSetAutoSac(scriptVariables.previousAutoSac);
      return;
    }
    toggleChallenges(ordinals[scriptVariables.currentTransChallenge]);
  }
}

// Automatically enters Reincarnation challenges, exits after they start taking too long, and moves to the next one
// Set scriptVariables.currentReincChallenge to 0 to start
function scriptAutoChallengeReinc() {
  if (scriptVariables.currentReincChallenge < 0) return;
  if (scriptVariables.currentReincChallenge < 5) scriptVariables.currentReincChallenge = 5;

  let ordinals = [null,'one','two','three','four','five','six','seven','eight','nine','ten']

  if (!player.retrychallenges) toggleRetryChallenges();

  if (scriptVariables.currentReincChallenge === 5) {
    scriptVariables.previousAutoSac = player.autoAntSacrifice;
    scriptSetAutoSac(false);
  }

  // move to next challenge if the current one is taking too long, and stop challenging after c5 is done
  if (player.currentChallengeRein == "" || (player.currentChallengeRein == ordinals[scriptVariables.currentReincChallenge] && player.reincarnationcounter > scriptSettings.maxReincChallengeDuration)) {
    if (player.currentChallengeRein != "") {
      resetCheck('reincarnationchallenge');
    }
    if (scriptVariables.currentReincChallenge < 11) {
      scriptVariables.currentReincChallenge++;
    }
    else {
      scriptVariables.currentReincChallenge = -1;
      resetCheck('reincarnate');
      scriptSetAutoSac(scriptVariables.previousAutoSac);
      return;
    }

    // Don't try if you cant succeed
    switch (scriptVariables.currentReincChallenge) {
      case  7:
        if (player.reincarnationPoints.exponent < 20) {scriptVariables.currentReincChallenge = 11; return;}
        break;
      case  8:
        if (player.reincarnationPoints.exponent < 200) {scriptVariables.currentReincChallenge = 11; return;}
        break;
      case  9:
        if (player.reincarnationPoints.exponent < 800) {scriptVariables.currentReincChallenge = 11; return;}
        break;
      case 10:
        if (player.reincarnationPoints.exponent < 90000) {scriptVariables.currentReincChallenge = 11; return;}
        break;
      case 11:
        return;
    }

    toggleChallenges(ordinals[scriptVariables.currentReincChallenge]);
  }
}

// AutoRune helper functions
// Spends less than but as close as possible to the given amount of offerings on the given rune (1 to 5)
function scriptLevelRune(rune, offerings) {
  let spent = 0;
  let tospend = 1000;
  let amount = tospend * (player.upgrades[78] ? 1000 : 1);
  toggleBuyAmount(tospend,'offering');
  while (spent < offerings) {
    if (spent + amount < offerings) {
      redeemShards(rune);
      spent += amount;
    } else if (tospend <= 1) {
      return;
    } else {
      tospend /= 10;
      amount = tospend * (player.upgrades[78] ? 1000 : 1);
      toggleBuyAmount(tospend,'offering');
    }
  }
}

// Automatically levels up runes
function scriptAutoRunes() {
  // If saving for respec, keep at least 800k
  if (scriptVariables.saveOfferingsForRespecs && player.runeshards < 800000) return;

  // Save up when rune exp boosting techs are close, also if ants are available don't spend before 10m ant time
  let obtPerSec = calculateAutomaticObtainium();
  if ((scriptVariables.autoRunesWaitForTech === 0 || scriptVariables.autoRunesWaitForTech === 1) && player.researches[23] < researchMaxLevels[23] && obtPerSec > researchBaseCosts[23] / 5) {
    if (scriptVariables.autoRunesWaitForTech === 0) sLog(5, "Saving Offerings for 5x3");
    scriptVariables.autoRunesWaitForTech = 1;
    return;
  }
  if ((scriptVariables.autoRunesWaitForTech === 0 || scriptVariables.autoRunesWaitForTech === 2) && player.researches[91] < researchMaxLevels[91] && obtPerSec > researchBaseCosts[91] / 100) {
    if (scriptVariables.autoRunesWaitForTech === 0) sLog(5, "Saving Offerings for 4x16");
    scriptVariables.autoRunesWaitForTech = 2;
    return;
  }
  if ((scriptVariables.autoRunesWaitForTech === 0 || scriptVariables.autoRunesWaitForTech === 3) && player.researches[92] < researchMaxLevels[92] && obtPerSec > researchBaseCosts[92] / 100) {
    if (scriptVariables.autoRunesWaitForTech === 0) sLog(5, "Saving Offerings for 4x17");
    scriptVariables.autoRunesWaitForTech = 3;
    return;
  }
  if (player.reincarnationPoints.exponent > 800 && player.antSacrificeTimer < 600) return;


  // Spending
  // Level equally, thrift first, skipping maxed runes
  let availableOfferings = player.runeshards - (scriptVariables.saveOfferingsForRespecs ? 800000 : 0);
  if (availableOfferings < (player.upgrades[78] > 0.5 ? 10000 : 10)) return; // Only spend if spending equally is possible
  let offeringsToSpend = 0;
  let runeCount = 0;
  // Spend equally. Count uncapped runes, then spend equally across all
  for (let i = 0; i < 5; i++) {
    if (player.runelevels[i] < scriptSettings.runeCaps[i]) {
      runeCount += scriptSettings.runeWeights[i];
    }
  }
  offeringsToSpend = availableOfferings / runeCount;

  for (let i = 1; i <= 5; i++) {
    let runeToLevel = i;
    if (i === 4) runeToLevel = 1;
    if (i === 1) runeToLevel = 4;
    if (player.runelevels[runeToLevel-1] < scriptSettings.runeCaps[runeToLevel-1]) scriptLevelRune(runeToLevel, offeringsToSpend * scriptSettings.runeWeights[runeToLevel-1]);
  }

  // If we ended up spending, we're not waiting
  scriptVariables.autoRunesWaitForTech = 0;
}

// Automatically gets Reincarnation Upgrades
function scriptAutoReincUpgrades() {
  for (let i = 61; i <= 80; i++) {
    if (player.upgrades[i] < 0.5 && player.reincarnationPoints.greaterThanOrEqualTo(Decimal.pow(10, upgradeCosts[i]))) buyUpgrades('reincarnation', i);
  }
}

// Opens all cubes
function scriptAutoOpenCubes() {
  openCube(1,true);
}

// Automatically buy particle buildings (for when you don't have the relevant row 1 cube upgrades)
// Tries to buy 10k with each script run
function scriptAutoPartBuildings() {
  toggleBuyAmount(1000,'particle');
  let baseCost = 1;
  for (let j = 0; j < 5; j++) {
    switch (j) {
      case 0: baseCost = 1e16; break;
      case 1: baseCost = 1e8; break;
      case 2: baseCost = 1e4; break;
      case 3: baseCost = 100; break;
      case 4: baseCost = 1; break;
    }
    for (let i = 0; i < 100 && player.reincarnationPoints.greaterThanOrEqualTo(player[ordinals[4-j]+"CostParticles"]); i++) {
      buyParticleBuilding(ordinals[4-j],baseCost);
    }
  }
}

// Calls all other automator functions if they are turned on
function scriptAutoAll () {
  if (scriptSettings.autoTurnedOn) {
    if (scriptSettings.autoLog) scriptAutoLog();
    if (scriptSettings.autoGameFlow) scriptAutoGameFlow();
    if (scriptSettings.autoTalismans) scriptAutoTalismans();
    if (scriptSettings.autoChallengeTrans) scriptAutoChallengeTrans();
    if (scriptSettings.autoChallengeReinc) scriptAutoChallengeReinc();
    if (scriptSettings.autoRunes) scriptAutoRunes();
    if (scriptSettings.autoReincUpgrades) scriptAutoReincUpgrades();
    if (scriptSettings.autoOpenCubes) scriptAutoOpenCubes();
    if (scriptSettings.autoPartBuildings) scriptAutoPartBuildings();
  }
}

sLog(0, "Starting Script");
resetCheck('challenge');
resetCheck('reincarnationchallenge');

window.setInterval(scriptAutoAll, scriptSettings.scriptInterval);