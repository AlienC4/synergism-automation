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
Go to your Synergism tab, press F12 and paste the script into the Javascript console to use it, then press enter. Refresh the page or use window.clearInterval(###Interval ID returned after copypaste here###) to get rid of it.
Step by step instructions: Click into this text, Ctrl-A, Ctrl-C, switch to synergism window, F12 (depending on browser), click into the javascript console prompt, Ctrl-V, Enter
There is some logging enabled by default, which will show up in the JS console.
If it worked the script GUI should show up at the bottom of the page. Settings can be changed through the GUI, for other changes you will have to edit the script.

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
1.6.1 14-Aug-20  Fix GUI for Firefox
- GUI works now in Firefox

1.6   14-Aug-20  Settings GUI and settings moved to browser local storage
- Moved settings to browser local storage. They are now saved on change and restored when you load the script.
- Added settings GUI.
- Added setting to configure delay before challenges after reincarnation.

1.5   06-Aug-20  AutoRunes improvements and new version optimization
- Added several AutoRunes settings to customize it
- Due to some game changes it's currently not possible to split large amounts of offerings efficiently across all runes. Added a limiter setting to keep the script from freezing.
- Added several AutoFlow settings
- Several optimizations for new version gameplay

1.4   06-Aug-20  Fixes for new game version
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
- Option to limit each challenge completions
- Log current speedup and maybe other game stats
- Auto Research for pre-roomba?
- Tampermonkey stuff for automatic script loading
- Refactor into a looping function to simplify variable names without risking naming conflicts and get rid of the window.setInterval
- Add settings save version as a hidden setting. Reset changed settings if needed and print a log message about changed or new settings and where they are.
- Settings and dashboard GUI part 2
  * Auto-adjust width
  * Scrollbar if too long
  * Buttons to reset settings to default and maybe other stuff (start challenges manually)
  * Build HUD for script stats
  * Move log to a textfield
  * Option to hide GUI
*/



let scriptSettings = {};
let scriptDefineSettings = {};
let tempSetting = {};
// Settings infrastructure and definitions
class scriptSetting {
  constructor(name, defaultValue, description, label, section, column, order, spaceafter = false) {
    this.name = name;
    this.defaultValue = defaultValue;
    this.description = description;
    this.label = label;
    this.section = section;
    this.column = column;
    this.order = order;
    scriptDefineSettings[name] = this;
  }
}

// Settings Definitions and default values
tempSetting = new scriptSetting("autoTurnedOn", true, "Master Switch for the script.", "Master Switch", "main", "toggles", 1, true);
tempSetting = new scriptSetting("scriptInterval", 1000, "How often the script runs. Time between runs in milliseconds. Only refreshed on reload.", "Script Interval", "main", "toggles", 150);

// Toggles for Script features
tempSetting = new scriptSetting("autoLog", true, "Does some periodic logging, as long as logLevel is at least 2", "Auto Log", "main", "toggles", 10);
tempSetting = new scriptSetting("autoGameFlow", false, "Reincarnate, Ascend, do challenges, respec runes", "Auto Flow", "main", "toggles", 20);
tempSetting = new scriptSetting("autoTalismans", false, "Automatically enhances and fortifies talismans and buys Mortuus ant", "Auto Talismans", "main", "toggles", 30);
tempSetting = new scriptSetting("autoChallengeTrans", false, "Runs Trans challenges, but only if triggered manually or by autoGameFlow", "Auto Challenge Trans", "main", "toggles", 40);
tempSetting = new scriptSetting("autoChallengeReinc", false, "Runs Reinc challenges, but only if triggered manually or by autoGameFlow", "Auto Challenge Reinc", "main", "toggles", 50);
tempSetting = new scriptSetting("autoRunes", false, "Automatically levels runes. Saves offerings just before getting some techs and at ant timer < some value", "Auto Runes", "main", "toggles", 60);
tempSetting = new scriptSetting("autoReincUpgrades", false, "Automatically buys Particle upgrades", "Auto Particle Upgrades", "main", "toggles", 70);
tempSetting = new scriptSetting("autoOpenCubes", false, "Automatically opens all cubes", "Auto Open Cubes", "main", "toggles", 80);
tempSetting = new scriptSetting("autoPartBuildings", false, "Automatically buy particle buildings every script interval. For when you don't have c1x7 to c1x9 yet.", "Auto Particle Buildings", "main", "toggles", 90, true);

// Logging Settings
tempSetting = new scriptSetting("logLevel", 10, "How much to log. 10 prints all messages, 0 logs only script start.", "Log Level", "main", "log", 50);
tempSetting = new scriptSetting("logInterval", 300, "Logs some general game data to console every X seconds. Logging level needs to be at least 2 for this to work.", "Log Interval", "main", "log", 60);

// Game flow settings
tempSetting = new scriptSetting("flowAscendAtC10Completions", 1, "Ascend only if C10 has been completed at least this many times", "C10 for ascend", "flow", "ascend", 10);
tempSetting = new scriptSetting("flowAscendImmediately", false, "Ascend once the target C10 completions have been reached, ignoring all other checks. May ascend without first respeccing talismans!", "Ascend ASAP", "flow", "ascend", 20);

tempSetting = new scriptSetting("flowInitialWaitBeforeChallenges", 10, "How long to wait after ascension before challenges can be started", "Wait after Ascension", "flow", "challenges", 10);
tempSetting = new scriptSetting("flowReincChallengePartMulti", 1.1, "Start reincarnation challenges only if particle exponent has multiplied at least this much since last time (or since script start)", "Reinc Particles Multi", "flow", "challenges", 20);
tempSetting = new scriptSetting("flowReincChallengePartPlus", 1000, "Start reincarnation challenges only if particle exponened has increased at least this much (only one of the conditions needs to be true)", "Reinc Particles Plus", "flow", "challenges", 30);
tempSetting = new scriptSetting("flowMinTimeBetweenReincChallenges", 60, "Minimum Ascension Counter (= realtime) between Reinc challenges", "Time between Reinc", "flow", "challenges", 40, true);
tempSetting = new scriptSetting("flowTransChallengePartMulti", 1.1, "Start transcension challenges only if particle exponent has multiplied at least this much since last time (or since script start)", "Trans Particles Multi", "flow", "challenges", 50);
tempSetting = new scriptSetting("flowTransChallengePartPlus", 1000, "Same as reinc", "Trans Particles Plus", "flow", "challenges", 60);
tempSetting = new scriptSetting("flowMinTimeBetweenTransChallenges", 60, "Same as reinc", "Time between Trans", "flow", "challenges", 70);

tempSetting = new scriptSetting("flowStartSavingOfferingsRuneLevel", 1000, "Post-respec prism rune level to start saving offerings for respecs", "Start Saving Offerings Level", "flow", "blessings", 10);
tempSetting = new scriptSetting("flowRespecToBlessingsRuneLevel", 4000, "Post-respec prism rune level to respec into 1 3 5", "Respec to 135 Level", "flow", "blessings", 10);
tempSetting = new scriptSetting("flowPushTalismanLevel", 1, "Minimum Talisman 1 level to start Challenge Pushes", "Minimum Talisman 1 enhance for pushing", "flow", "blessings", 10);
tempSetting = new scriptSetting("flowKeepPushingWithoutMaxedTalis", false, "false: Do a challenge push with rune respec only if Talisman levels have changed, or when talismans are maxed push when ant levels have changed enough. true: Keep pushing if ant levels change enough, even when talismans are not maxed", "Keep pushing without Talisman enhance", "flow", "blessings", 10);
tempSetting = new scriptSetting("flowPushAntChange", 300, "How much the sum of ant generator levels (excluding first one) needs to change to start another push", "Ant change for push", "flow", "blessings", 10);

// Talisman settings
tempSetting = new scriptSetting("talismanInterval", 10000, "How often to buy Talismans. Interval in Milliseconds.", "Talisman interval", "runes", "talismans", 10);
tempSetting = new scriptSetting("talismansEnhance", [true, true, false, false, false, true, false], "Which talismans to enhance. All talismans are fortified.", "Enhance Talisman X", "runes", "talismans", 20); // TODO: change to boolean!

// Auto Trans Challenge settings
tempSetting = new scriptSetting("maxTransChallengeDuration", 2, "How long to wait for completion of trans challenges (trans counter)", "Max duration", "challenges", "trans", 10);

// Auto Reinc Challenge settings
tempSetting = new scriptSetting("maxReincChallengeDuration", 10, "How long to wait for completion of reinc challenges (reinc counter)", "Max duration", "challenges", "reinc", 10);

// Auto Runes settings
tempSetting = new scriptSetting("runeCaps", [5000, 5000, 5000, 5000, 5000], "Put your rune caps here, or put to what level you want the rune auto levelled (might go a bit higher)", "Rune caps", "runes", "runes", 10);
tempSetting = new scriptSetting("runeWeights", [1, 2, 1, 3, 4], "Weights for how many offerings to put into each rune", "Rune weights", "runes", "runes", 20, true);
tempSetting = new scriptSetting("runeAntTimer", 10, "Will not spend offerings until the sacrifice timer has reached this amount of seconds", "Minimum Ant timer", "runes", "runes", 30);
tempSetting = new scriptSetting("runeSpendingCap", 1e7, "Spend at most this many offerings at once to keep the script from lagging", "Offering spending cap", "runes", "runes", 40, true);
tempSetting = new scriptSetting("runeTech5x3Wait", 1, "Will save offerings if 5x3 is not maxed and Automatic Obt per real real second is at least the cost of a 5x3 level divided by this setting. Set to 0 to turn off.", "5x3 wait", "runes", "runes", 50);
tempSetting = new scriptSetting("runeTech4x16Wait", 1, "Same but for 4x16", "4x16 wait", "runes", "runes", 60);
tempSetting = new scriptSetting("runeTech4x17Wait", 1, "Same but for 4x17", "4x17 wait", "runes", "runes", 70);


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
scriptVariables.displayInitialized = false;
scriptVariables.settingsTabs = [];

// Settings infrastructure
function scriptSettingsSave() {
  window.localStorage.setItem('galefuryScriptSettings', JSON.stringify(scriptSettings));
}

// Prints scriptSettings to console as a JSON string
function scriptSettingsExport() {
  console.log(JSON.stringify(scriptSettings));
}

// Sets defined settings that are not found in the scriptSettings object to default values
function scriptSettingsFillDefaults() {
  if (!scriptSettings) scriptSettings = {initial: "initial"};
  Object.keys(scriptDefineSettings).forEach(function(key,index) {
    if (!(scriptSettings.hasOwnProperty(key))) {
      scriptSettings[key] = scriptDefineSettings[key].defaultValue;
      console.log("Setting " + key + " set to default Value " + scriptDefineSettings[key].defaultValue);
    }
  });
}

// Removes any settings that are not in the settings definition
function scriptSettingsClean() {
  Object.keys(scriptSettings).forEach(function(key,index) {
    if (!(scriptDefineSettings.hasOwnProperty(key))) {
      delete scriptSettings[key];
      console.log("Setting " + key + " deleted");
    }
  });
}

// Imports settings from a JSON String, sets any defined but not imported settings to default value
function scriptSettingsImport (settings) {
  if (settings != null) {
    scriptSettings = JSON.parse(settings);
  } else {
    scriptSettings = {};
  }
  scriptSettingsFillDefaults();
  scriptSettingsClean();
  scriptSettingsSave();
}

// Loads script settings from browser local storage
function scriptSettingsLoad() {
  scriptSettingsImport(window.localStorage.getItem('galefuryScriptSettings'));
}

// Removes script settings from browser local storage
function scriptSettingsRemoveStorage() {
  window.localStorage.removeItem('galefuryScriptSettings');
  console.log("Script settings removed from local storage");
}

// Resets script settings to default values
function scriptSettingsResetToDefault() {
  scriptSettings = {};
  scriptSettingsFillDefaults();
  scriptSettingsClean();
  scriptSettingsSave();
}

// Creates a HTML Element from a String
function scriptCreateElement(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstElementChild;
}

// Event Handler for changing a settings checkbox
function scriptToggleCheckbox(setting, index = -1) {
  if (index === -1) {
    if (event.target.checked) {
      scriptSettings[setting] = true;
    } else {
      scriptSettings[setting] = false;
    }
  } else {
    if (event.target.checked) {
      scriptSettings[setting][index] = true;
    } else {
      scriptSettings[setting][index] = false;
    }
  }
  scriptSettingsSave();
}

// Returns a label + checkbox element tied to the given setting
function scriptCreateCheckbox(id, setting, label, mouseover, arrayCount = 0) {
  if (arrayCount === 0) {
    let element = '<div class=scriptsettings-container><label class = "scriptsettings-label" title = "'+mouseover+'" for = "'+id+'">'+label+'</label>'+
                  '<input type="checkbox" id="'+id+'" class = "scriptsettings-checkbox" title="'+mouseover+'"'+(scriptSettings[setting]?' checked':'')+
                  ' onchange = "scriptToggleCheckbox(\''+setting+'\')"></div>';
    return scriptCreateElement(element);
  } else {
    let element = '<div class=scriptsettings-container><label class = "scriptsettings-label" title = "'+mouseover+'">'+label+'</label><div class = "scriptsettings-arraycontainer-checkbox">'
    for (let i = 0; i < arrayCount; i++) {
      element += '<input type="checkbox" id="'+id+'-'+i+'" class = "scriptsettings-checkbox" title="'+mouseover+'"'+(scriptSettings[setting][i]?' checked':'')+
                  ' onchange = "scriptToggleCheckbox(\''+setting+'\', '+i+')">'
    }
    element += '</div></div>';
    return scriptCreateElement(element);
  }
}

// Event Handler for changing a number field
function scriptChangeNumberField(setting, index = -1) {
  if (index === -1) {
    scriptSettings[setting] = Number(event.target.value);
  } else {
    scriptSettings[setting][index] = Number(event.target.value);
  }
  scriptSettingsSave();
}

// Returns a label + number field tied to the given setting
function scriptCreateNumberField(id, setting, label, mouseover, arrayCount = 0) {
  if (arrayCount === 0) {
    let element = '<div class=scriptsettings-container><label class = "scriptsettings-label" title = "'+mouseover+'" for = "'+id+'">'+label+'</label>'+
                  '<input type="number" id="'+id+'" class = "scriptsettings-numberfield" title="'+mouseover+'" value = "'+scriptSettings[setting]+'" '+
                  'onchange = "scriptChangeNumberField(\''+setting+'\')"></div>';
    return scriptCreateElement(element);
  } else {
    let element = '<div class=scriptsettings-container><label class = "scriptsettings-label" title = "'+mouseover+'">'+label+'</label><div class = "scriptsettings-arraycontainer-number">'
    for (let i = 0; i < arrayCount; i++) {
      element += '<input type="number" id="'+id+'-'+i+'" class = "scriptsettings-numberfield" title="'+mouseover+'" value = "'+scriptSettings[setting][i]+'" '+
                  'style = "width: '+(95/arrayCount)+'%" '+
                  'onchange = "scriptChangeNumberField(\''+setting+'\', '+i+')">'
    }
    element += '</div></div>';
    return scriptCreateElement(element);
  }
}

// Creates an empty settings column
function scriptCreateSettingsColumn(id, width, heading) {
  let element = '<div id = "'+id+'" class=scriptsettings-column style = "width: '+width+'"><p class="scriptsettings-column-heading script-para">'+heading+'</p></div>';
  return scriptCreateElement(element);
}

// Event Handler for settings tab buttons
function scriptChangeSettingsTab(tab) {
  for (let i = 0; i < scriptVariables.settingsTabs.length; i++) {
    if (scriptVariables.settingsTabs[i] === tab) {
      document.getElementById(scriptVariables.settingsTabs[i]).style.display = 'flex';
      document.getElementById(scriptVariables.settingsTabs[i]+"-headerbutton").style.backgroundColor = 'darkred';
    } else {
      document.getElementById(scriptVariables.settingsTabs[i]).style.display = 'none';
      document.getElementById(scriptVariables.settingsTabs[i]+"-headerbutton").style.backgroundColor = 'black';
    }
  }
}

// Creates an empty settings section with header button
function scriptCreateSettingsSection(id, name, container, header) {
  // Create header button
  document.getElementById(header).append(scriptCreateElement('<input type="button" id = "'+id+'-headerbutton" class = "scriptsettings-header-button" onclick = "scriptChangeSettingsTab(\''+id+'\')" value = "'+name+'">'));
  
  // Create div
  document.getElementById(container).append(scriptCreateElement('<div id = "'+id+'" class = "script-section"></div>'));
  
  // Append to tabs list
  scriptVariables.settingsTabs.push(id);
}

// Adds a single setting to its section (ignores order)
function scriptAddOneSettingToSections(setting) {
  let arrayCount = 0;
  let datatype = typeof scriptDefineSettings[setting].defaultValue;
  if (datatype === "object") {
    datatype = typeof scriptDefineSettings[setting].defaultValue[0];
    arrayCount = scriptDefineSettings[setting].defaultValue.length;
  }
  
  let element;
  switch (datatype) {
    case "number": element = scriptCreateNumberField("scriptsetting-"+setting, setting, scriptDefineSettings[setting].label, scriptDefineSettings[setting].description, arrayCount); break;
    case "boolean": element = scriptCreateCheckbox("scriptsetting-"+setting, setting, scriptDefineSettings[setting].label, scriptDefineSettings[setting].description, arrayCount); break;
    default: console.error("Data Type "+datatype+" of setting "+setting+" is not compatible!"); return;
  }
  
  let col = document.getElementById("script-settings-"+scriptDefineSettings[setting].section+"-"+scriptDefineSettings[setting].column);
  if (col) {
    col.append(element);
  } else {
    console.error("Section/Column "+scriptDefineSettings[setting].section+"/"+scriptDefineSettings[setting].column+" for setting "+setting+" not found!");
  }
}

// Adds all the defined settings to the sections
function scriptAddSettingsToSections() {
  let sorted = Object.keys(scriptDefineSettings).sort((a, b)=>(scriptDefineSettings[a].order - scriptDefineSettings[b].order));
  for (i = 0; i < sorted.length; i++) {
    scriptAddOneSettingToSections(sorted[i]);
  }
}

function scriptInitializeDisplay() {
  let settings_tab = document.getElementById('settings');
  let body;
  if (settings_tab) body = settings_tab.parentElement.parentElement;
  if (body) {
    body.append(scriptCreateElement('<div id="script-settings" style="color: white; position: absolute; top: 720px; margin-left: 20px; min-width: 1250px; max-width: 1400px;"></div>'));
    
    // Insert Stylesheet
    let style = document.createElement('style');
    style.innerHTML =
      '.script-para {'+
        'margin-block-start: 1px; margin-block-end: 1px;'+
      '}'+
      '.script-header {'+
        'display:flex; flex-flow: row nowrap; justify-content: flex-start;'+
      '}'+
      '.scriptsettings-header-button {'+
        'color: white; background-color: black; border: 1px solid purple; padding: 2px'+
      '}'+
      '.script-section {'+
        'display:none; flex-flow: row nowrap; justify-content: space-between; width = 100%;'+
      '}'+
    	'.script-heading {' +
    		'color: purple;' +
        'background-color: #e5e5e5;'+
      '}'+
      '.scriptsettings-column {'+
        'display:flex; flex-flow: column nowrap; justify-content: flex-start; padding: 2px;'+
      '}'+
      '.scriptsettings-column-heading {'+
        'color: darkorchid'+
      '}'+
      '.scriptsettings-label {'+
        'min-width: 100px; white-space:nowrap;'+
      '}'+
      '.scriptsettings-arraycontainer-checkbox {'+
        'width: 40%; display: flex; justify-content: space-between;'+
      '}'+
      '.scriptsettings-checkbox {'+
      '}'+
      '.scriptsettings-arraycontainer-number {'+
        'width: 60%; display: flex; justify-content: space-between;'+
      '}'+
      '.scriptsettings-numberfield {'+
        'background-color: #202020; color: white; max-width: 100px'+
      '}'+
      '.scriptsettings-container {'+
        'display:flex; justify-content: space-between;'+
    	'}';
    let ref = document.querySelector('script');
    ref.parentNode.insertBefore(style, ref);
    
    // Insert script settings header
    document.getElementById('script-settings').append(scriptCreateElement('<div id="script-settings-header" class="script-header"><p class = "script-heading script-para" style = "margin-right: 3px; padding-left: 2px; padding-right: 2px">Script Settings</p></div>'));
    
    // Insert script settings sections
    scriptCreateSettingsSection("script-settings-main", "Main", "script-settings", "script-settings-header");
    document.getElementById('script-settings-main').append(scriptCreateSettingsColumn('script-settings-main-info', '40%', 'Info'));
    document.getElementById('script-settings-main').append(scriptCreateSettingsColumn('script-settings-main-log', '40%', 'Log'));
    document.getElementById('script-settings-main').append(scriptCreateSettingsColumn('script-settings-main-toggles', '20%', 'Toggles'));
    scriptCreateSettingsSection("script-settings-flow", "Flow", "script-settings", "script-settings-header");
    document.getElementById('script-settings-flow').append(scriptCreateSettingsColumn('script-settings-flow-ascend', '22%', 'Ascension'));
    document.getElementById('script-settings-flow').append(scriptCreateSettingsColumn('script-settings-flow-challenges', '39%', 'Challenges'));
    document.getElementById('script-settings-flow').append(scriptCreateSettingsColumn('script-settings-flow-blessings', '39%', 'Talismans, Blessings & Pushing'));
    scriptCreateSettingsSection("script-settings-runes", "Runes & Talismans", "script-settings", "script-settings-header");
    document.getElementById('script-settings-runes').append(scriptCreateSettingsColumn('script-settings-runes-runes', '40%', 'Runes'));
    document.getElementById('script-settings-runes').append(scriptCreateSettingsColumn('script-settings-runes-talismans', '40%', 'Talismans'));
    scriptCreateSettingsSection("script-settings-challenges", "Challenges", "script-settings", "script-settings-header");
    document.getElementById('script-settings-challenges').append(scriptCreateSettingsColumn('script-settings-challenges-trans', '40%', 'Transcension Challenges'));
    document.getElementById('script-settings-challenges').append(scriptCreateSettingsColumn('script-settings-challenges-reinc', '40%', 'Reincarnation Challenges'));
    
    scriptAddSettingsToSections();
    scriptChangeSettingsTab("script-settings-main");
    
    scriptVariables.displayInitialized = true;
  } else {
    console.error("Could not create script GUI, body not found.")
  }
}

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
  for (let i = 0; i < 7; i++) {
    if (player.talismanRarity[i+1] < 6 && scriptSettings.talismansEnhance[i]) return false;
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
  if (player.upgrades[70] < 1) scriptVariables.targetReincTime = 10; // If you don't have the e22 particle upgrade, reincarnate every 30s to keep max obt up to date
  else if (player.reincarnationPoints.exponent < 10000) scriptVariables.targetReincTime = 10;  // With the e22 particle upgrade but low particles, reincarnate every 60s to keep max obt fairly decent and quickly boost particles
  else scriptVariables.targetReincTime = 10;// set very low because of current lategame balance //60000; // Auto Reincarnation should be on and set to 4440, if not reincarnate after a long time

  // Turn Ant Sacrifice back on if doing nothing
  if (scriptNoCurrentAction()) scriptSetAutoSac(true);

  // Start saving 800k offerings for respecs once prism goes above 850
  // Once it is on it stays on
  scriptVariables.saveOfferingsForRespecs = scriptVariables.saveOfferingsForRespecs || ((player.runelevels[2] + maxTalismanBonus + bonusant9 + player.antUpgrades[9]) > scriptSettings.flowStartSavingOfferingsRuneLevel);
  // see around line 500 in updatehtml.js 'if (currentTab == "runes"' for bonus level calc

  // Do Talisman respec for blessings once prism can go above 1050
  if (scriptNoCurrentAction() && !scriptVariables.ascensionBlessingRespecDone && (player.runelevels[2] + maxTalismanBonus + bonusant9 + player.antUpgrades[9]) > scriptSettings.flowRespecToBlessingsRuneLevel && player.runeshards > 400000) {
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
  if (player.challengecompletions["ten"] >= scriptSettings.flowAscendAtC10Completions && (scriptSettings.flowAscendImmediately  || (scriptNoCurrentAction() && player.runeshards > 400000))) {
    sLog(2, "Ascending with " + player.challengecompletions.ten + " C10 completions after " + player.ascensionCounter + " seconds");

    if (scriptSettings.autoLog) scriptLogStuff();

    // Exit any running challenges
    if (player.currentChallenge != "") resetCheck('challenge');
    if (player.currentChallengeRein != "") resetCheck('reincarnationchallenge');
    
    // Respec to 2 4 5
    if (player.runeshards > 400000) {
      mirrorTalismanStats = [null, -1, 1, -1, 1, 1];
      respecTalismanConfirm(8);
    }

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
    scriptVariables.hasUpgrade3x8 = player.cubeUpgrades[28] > 0;
    scriptVariables.currentTransChallenge = -1;
    scriptVariables.currentReincChallenge = -1;

    scriptVariables.currentAction = ""; //A
    scriptVariables.actionStep = -1; //A

    sLog(1, "Ascended");
  }

  // Handle doing challenges occasionally (before blessings)
  if (scriptNoCurrentAction() && (!scriptVariables.ascensionBlessingRespecDone || player.challengecompletions["nine"] === 0) && player.ascensionCounter > scriptSettings.flowInitialWaitBeforeChallenges) {
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
  if (scriptNoCurrentAction() && player.runeshards > 800000 && scriptVariables.saveOfferingsForRespecs && player.talismanRarity[1] >= scriptSettings.flowPushTalismanLevel && player.antSacrificeTimer > 300 &&
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

	  if (scriptSettings.talismansEnhance[i-1]) {
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
function scriptLevelRune(rune, offerings, spendAll) {
  if (spendAll) {
    toggleBuyAmount(1000,'offering');
    redeemShards(rune);
  }
  else
  {
    let spent = 0;
    let tospend = 100;
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
}

// Automatically levels up runes
function scriptAutoRunes() {
  // If saving for respec, keep at least 800k
  if (scriptVariables.saveOfferingsForRespecs && player.runeshards < 800000) return;

  // Save up when rune exp boosting techs are close, also if ants are available don't spend before 10m ant time
  let obtPerSec = calculateAutomaticObtainium();
  if ((scriptVariables.autoRunesWaitForTech === 0 || scriptVariables.autoRunesWaitForTech === 1) && scriptSettings.runeTech5x3Wait > 0 && player.researches[23] < researchMaxLevels[23] && obtPerSec > researchBaseCosts[23] / scriptSettings.runeTech5x3Wait) {
    if (scriptVariables.autoRunesWaitForTech === 0) sLog(5, "Saving Offerings for 5x3");
    scriptVariables.autoRunesWaitForTech = 1;
    return;
  }
  if ((scriptVariables.autoRunesWaitForTech === 0 || scriptVariables.autoRunesWaitForTech === 2) && scriptSettings.runeTech4x16Wait > 0 && player.researches[91] < researchMaxLevels[91] && obtPerSec > researchBaseCosts[91] / scriptSettings.runeTech4x16Wait) {
    if (scriptVariables.autoRunesWaitForTech === 0) sLog(5, "Saving Offerings for 4x16");
    scriptVariables.autoRunesWaitForTech = 2;
    return;
  }
  if ((scriptVariables.autoRunesWaitForTech === 0 || scriptVariables.autoRunesWaitForTech === 3) && scriptSettings.runeTech4x17Wait > 0 && player.researches[92] < researchMaxLevels[92] && obtPerSec > researchBaseCosts[92] / scriptSettings.runeTech4x17Wait) {
    if (scriptVariables.autoRunesWaitForTech === 0) sLog(5, "Saving Offerings for 4x17");
    scriptVariables.autoRunesWaitForTech = 3;
    return;
  }
  if (player.reincarnationPoints.exponent > 800 && player.antSacrificeTimer < scriptSettings.runeAntTimer) return;


  // Spending
  // Level equally, thrift first, skipping maxed runes
  let availableOfferings = player.runeshards - (scriptVariables.saveOfferingsForRespecs ? 800000 : 0);
  availableOfferings = Math.min(availableOfferings, scriptSettings.runeSpendingCap);
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
    if (player.runelevels[runeToLevel-1] < scriptSettings.runeCaps[runeToLevel-1]) scriptLevelRune(runeToLevel, offeringsToSpend * scriptSettings.runeWeights[runeToLevel-1], false);
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
  if (!(scriptVariables.displayInitialized)) scriptInitializeDisplay();
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

scriptSettingsLoad()
sLog(0, "Starting Script");
resetCheck('challenge');
resetCheck('reincarnationchallenge');

window.setInterval(scriptAutoAll, scriptSettings.scriptInterval);