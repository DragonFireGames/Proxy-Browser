var Object = window["Object"] || {};
(function Object() {
  //Moves objects to a specific position along a single axis, accelerating negatively.
  var position_N = this.position_N = function (target, value, resistance) {
    //Library ID: JUbrVJL6vQDCWRkjRMaDfulENkhV6zktexm_-uqtdq8
    //The N denotes negative, meaning the object accelerates negatively; from fast -> slow.

    //Checks if {resistance} is a valid number. If not, it is set to a default of 5.
    if (typeof resistance != "number") { resistance = 5; }

    //Checks if {value} is within 0.1 of {target}. If it is, then {target} is assigned to {value}. If not, {value} continues increasing/decreasing toward {target}.
    if (Math.abs(target - value.toFixed(2)) > 0.1) {
      value = value < target ? (value + (target - value) / resistance) : value - (value - target) / resistance;
    } else {
      value = target;
    }
    return value;
  }

  return this;
}).bind(Object)()

var p5Inst = new p5(null, 'sketch');

window.preload = function () {
  initMobileControls(p5Inst);

  p5Inst._predefinedSpriteAnimations = {};
  p5Inst._pauseSpriteAnimationsByDefault = false;
  var animationListJSON = { "orderedKeys": ["7d9037de-b9b8-4cd9-9a61-ae111fc4f34c", "9ef1c00c-afb3-4090-a75f-4b0b50a46e35", "53fdc36d-59ff-4d0d-8550-4adbcd8b42c8", "a585d52b-ed94-4c8a-8237-5ee8d408523c", "92ff5b7b-a3dd-4572-b3ad-7934746242f0"], "propsByKey": { "7d9037de-b9b8-4cd9-9a61-ae111fc4f34c": { "name": "grid", "sourceUrl": null, "frameSize": { "x": 500, "y": 400 }, "frameCount": 1, "looping": true, "frameDelay": 12, "version": "0RplL6t3JceKoTLfx4PUvefYZbWZ7DvE", "categories": [""], "loadedFromSource": true, "saved": true, "sourceSize": { "x": 500, "y": 400 }, "rootRelativePath": "assets/7d9037de-b9b8-4cd9-9a61-ae111fc4f34c.png" }, "9ef1c00c-afb3-4090-a75f-4b0b50a46e35": { "name": "characterRun", "sourceUrl": null, "frameSize": { "x": 55, "y": 43 }, "frameCount": 18, "looping": true, "frameDelay": 2, "version": "90KqPZCZHmlIYLEvUuGleS_vI7o4wV2d", "categories": [""], "loadedFromSource": true, "saved": true, "sourceSize": { "x": 220, "y": 215 }, "rootRelativePath": "assets/9ef1c00c-afb3-4090-a75f-4b0b50a46e35.png" }, "53fdc36d-59ff-4d0d-8550-4adbcd8b42c8": { "name": "characterIdle", "sourceUrl": null, "frameSize": { "x": 37, "y": 41 }, "frameCount": 1, "looping": true, "frameDelay": 12, "version": "OIoh5psfxA4hokBK6qKlgnDZjAmosLhh", "categories": [""], "loadedFromSource": true, "saved": true, "sourceSize": { "x": 37, "y": 41 }, "rootRelativePath": "assets/53fdc36d-59ff-4d0d-8550-4adbcd8b42c8.png" }, "a585d52b-ed94-4c8a-8237-5ee8d408523c": { "name": "coin", "sourceUrl": null, "frameSize": { "x": 25, "y": 25 }, "frameCount": 1, "looping": true, "frameDelay": 12, "version": "eiwuMtUkABlfc1g9IvIuWuyzgwheZJ_v", "categories": ["board_games_and_cards"], "loadedFromSource": true, "saved": true, "sourceSize": { "x": 25, "y": 25 }, "rootRelativePath": "assets/a585d52b-ed94-4c8a-8237-5ee8d408523c.png" }, "92ff5b7b-a3dd-4572-b3ad-7934746242f0": { "name": "gifts", "sourceUrl": null, "frameSize": { "x": 50, "y": 49 }, "frameCount": 14, "looping": true, "frameDelay": 12, "version": "xvfdjtqW0hJuPiEYAo_ymx6IFNNi.Ut.", "categories": [""], "loadedFromSource": true, "saved": true, "sourceSize": { "x": 200, "y": 196 }, "rootRelativePath": "assets/92ff5b7b-a3dd-4572-b3ad-7934746242f0.png" } } };
  var orderedKeys = animationListJSON.orderedKeys;
  var allAnimationsSingleFrame = false;
  orderedKeys.forEach(function (key) {
    var props = animationListJSON.propsByKey[key];
    var frameCount = allAnimationsSingleFrame ? 1 : props.frameCount;
    var image = loadImage(props.rootRelativePath, function () {
      var spriteSheet = loadSpriteSheet(
        image,
        props.frameSize.x,
        props.frameSize.y,
        frameCount
      );
      p5Inst._predefinedSpriteAnimations[props.name] = loadAnimation(spriteSheet);
      p5Inst._predefinedSpriteAnimations[props.name].looping = props.looping;
      p5Inst._predefinedSpriteAnimations[props.name].frameDelay = props.frameDelay;
    });
  });

  function wrappedExportedCode(stage) {
    if (stage === 'preload') {
      if (setup !== window.setup) {
        window.setup = setup;
      } else {
        return;
      }
    }
    // -----

    // discord has dispersed
    // prompt("There's a discord server for this game now! Join with this link: ", "https://discord.gg/trme5HsQHC");

    //Join the official discord server!
    //https://discord.gg/trme5HsQHC

    /*                      
                            
        【ＨＯＲＩＺＯＮ】     
                            
      Created in May 2023   
                            
      Made by f59phr        
      With the help of:     
      • Makbran             
      • Varrience           
                            
      Discord: @metrolight  
                            
                          */

    /*                                                                                                            
                                                                                                                  
      Bugs/Features                                                                                               
                                                                                                                  
        a. Current Bugs                                                                                           
          • Sometimes the player doesn't jump when the jump key is pressed while on a platform                    
          • The player is able to "clip" into the sides of platforms and can be stuck there                       
          • When the user starts the game for the first time, errors are caused by undefined data storage values  
          • The wall is too easy to escape/the game isn't challenging enough                                      
                                                                                                                  
        b. Fixed Bugs                                                                                             
          • Platforms generate too high which are not able to be reached by the player                            
          • Coins are teleported away from the player when a new platform is spawned                              
          • Speed and distance records are saved incorrectly                                                      
          • All data is shared between all users of the game                                                      
          • The game can't be restarted at the game over screen                                                   
          • The wall can be inescapable when the player dies near it                                              
          • Text entered into the upgrades screen prompts could cause errors                                      
          • The player can "refill" their jumps by touching the bottom of platforms                               
                                                                                                                  
        c. Planned Features                                                                                       
          • Special "powerups" that the player could randomly get like the current coin system                    
          • More upgrades                                                                                         
          • Special coins that could give the player extra coins or take away coins from the player               
          • Multiplayer racing mode? (Not likely to ever be implemented)                                          
                                                                                                                  
                                                                                                                */
    // would keep it in but original is dead, no point in pointing to a dead link & along with the dicord being dismantled
    // if (window.getURLPath()[2] != "fcX0FPfMdGiG0SRO4_eBBytwC0b9bNrtkXSG2Sp89WA") {
    //   prompt("This project is a remix. To access the original project, use this link:",
    //   "https://studio.code.org/projects/gamelab/fcX0FPfMdGiG0SRO4_eBBytwC0b9bNrtkXSG2Sp89WA");
    // }
    var lexend = loadFont("assets/lexend-1-.png")
    World.frameRate = 60;
    var grid = createSprite(200, 200);
    grid.scale = 1.05;
    grid.setAnimation("grid");
    grid.depth = 0;
    var gridPos = 0;
    var wall = createSprite(-100, 200, 100, 400);
    wall.depth = 0;
    wall.shapeColor = rgb(152, 17, 54);
    var platforms = createGroup();
    var titlePos = -70;
    var titleBar = createSprite(200, 250, 400, 50);
    titleBar.depth = 0;
    var titleGoal = 250;
    var titleColliders = createGroup();
    var titleCollider;
    for (var d = 250; d < 400; d += 75) {
      titleCollider = createSprite(200, d, 200, 50);
      titleCollider.depth = 0;
      titleCollider.visible = false;
      titleColliders.add(titleCollider);
    }
    var interactColliders = createGroup();
    var interactCollider;
    for (var n = 150; n <= 200; n += 50) {
      interactCollider = createSprite(300, n, 50, 45);
      interactCollider.depth = 0;
      interactCollider.visible = false;
      interactColliders.add(interactCollider);
    }
    // Main database
    var id = encodeURIComponent(getUserId());
    var dataKey = id + "playerData";
    var playerData = {
      visits: 1,
      coins: 0,
      topSpeed: 0,
      topDistance: 0,
      jumps: 1,
      lives: 1,
      keys: ["up", "left", "down", "right"],
      music: true
    };
    var keys = playerData.keys;
    var musicToggle = playerData.music;
    var jumpAmount = playerData.jumps;
    var maxLives = playerData.lives;
    var coins = playerData.coins;
    var highestSpeed = playerData.topSpeed;
    var farthestDistance = playerData.topDistance;
    var visits = playerData.visits;
    getKeyValue(dataKey, function (data) {
      if (data === null || data === undefined) {
        setKeyValue(dataKey, playerData);
      } else {
        data.visits += 1;
        playerData = data;
        setKeyValue(dataKey, data);
      }
      keys = playerData.keys;
      musicToggle = playerData.music;
      jumpAmount = playerData.jumps;
      maxLives = playerData.lives;
      coins = playerData.coins;
      highestSpeed = playerData.topSpeed;
      farthestDistance = playerData.topDistance;
      visits = playerData.visits;
    });

    var collectibles = createGroup();
    var miniCollectibles = createGroup();
    var startPos = 405;
    var character = createSprite(-50, 200);
    character.depth = 1;
    character.setAnimation("characterRun");
    character.setCollider("circle", -1, 0, 20);
    var miniCharacter = createSprite(200, 200);
    miniCharacter.depth = 1;
    miniCharacter.setAnimation("characterRun");
    miniCharacter.scale = character.scale / 8;
    miniCharacter.visible = false;
    var particles = createGroup();
    var startValue;
    var particle;
    var menuSongStarted = false;
    var gameSongStarted = false;
    var completed = false;
    var extraVelocity = 0;
    var maxVelocity = 5;
    var wallVelocity = 0;
    var xVelocity = 0;
    var jumped = 0;
    var lives = maxLives;
    var introOpacity = 0.0001;
    var textOpacity = 0.0001;
    var textPos = 500;
    var textList = ["Use " + keys[0] + ", " + keys[1] + ", " + keys[2] + ", and " + keys[3] + " to move the player", "Run from the red bar to survive", ("Press " + keys[2] + " to use your the slam ability"), "Collect coins to purchase upgrades"];
    var textIndex = -1;
    var mode = "menu";
    var randomCoin = 0;
    var extraCoins = 0;
    var originDistance = 0;
    var jumpPurchase = "NO";
    var livesPurchase = "NO";
    var menuMusic = "Before-The-Night---Home-(1).mp3";
    var gameplayMusic = "Hold---Home-(1).mp3";
    var minimapBackground = createSprite(camera.x, 80, 400, World.height / 8);
    minimapBackground.depth = 0;
    minimapBackground.visible = false;
    var minimapWorld = createSprite(camera.x, 80, World.width / 8, World.height / 8);
    minimapWorld.depth = 0;
    minimapWorld.visible = false;
    var buttonColliders = createGroup();
    var buttonCollider;
    for (var z = 250; z < 400; z += 50) {
      buttonCollider = createSprite(200, z, 200, 30);
      buttonCollider.depth = 0;
      buttonCollider.visible = false;
      buttonColliders.add(buttonCollider);
    }

    //main loop
    function draw() {
      background("white");
      titleBar.y = Object.position_N(titleGoal, titleBar.y, 5);
      if (mode == "menu") {
        titleBar.shapeColor = rgb(202, 17, 54, titlePos / 100);
        titlePos = Object.position_N(100, titlePos, 30);
        for (var a = 0; a < titleColliders.length; a++) {
          if (mouseIsOver(titleColliders[a])) {
            titleGoal = titleColliders[a].y;
            if (mouseWentDown("leftButton")) {
              startPos = 405;
              a == 0 ? (mode = "upgrades") : mode = "settings";
            }
          }
        }
        if (World.frameCount > 100) {
          if (keyWentDown("space")) {
            textOpacity = 0.0001;
            stopSound("assets/neon-gaming-128925.mp3");
            stopSound("assets/compressed-menu-music.mp3");
            maxLives = playerData.lives;
            jumpAmount = playerData.jumps;
            lives = maxLives;
            mode = "play";
          }
        }
        if (World.frameCount > 25) {
          if (!menuSongStarted) {
            if (musicToggle) {
              stopSound("assets/neon-gaming-128925.mp3");
              stopSound("assets/compressed-menu-music.mp3");
              playSound("assets/compressed-menu-music.mp3", true);
            }
            menuSongStarted = true;
          }
        }
      } else if ((mode == "upgrades")) {
        titleBar.shapeColor = rgb(202, 17, 54);
        if (titlePos.toFixed(2) > -74.99) {
          titlePos -= Math.abs((titlePos + 75) / 10);
        } else {
          titlePos = -75;
        }
        titleGoal = 325;
        if (textOpacity.toFixed(2) < 0.99) {
          textOpacity += Math.abs((textOpacity - 1) / 30);
        } else {
          textOpacity = 1;
        }
        if (mouseIsOver(titleColliders[1]) && mouseWentDown("leftButton")) {
          startPos = 405;
          textOpacity = 0.0001;
          mode = "menu";
        }
        if (mouseIsOver(interactColliders[0]) && mouseWentDown("leftButton")) {
          getKeyValue(dataKey, function (data) {
            coins = data.coins;
            if (data.coins - 200 >= 0) {
              jumpPurchase = prompt("Allows the character to jump an extra time.\n\nPrice: 200 coins\n\nEnter YES to purchase this upgrade and NO to cancel.");
            } else {
              prompt("Allows the character to jump an extra time.\n\nPrice: 200 coins\n\nYou do not have enough coins to purchase this upgrade.");
            }
            if (jumpPurchase == "YES") {
              coins = data.coins -= 200;
              jumpAmount = (data.jumps += 1);
              setKeyValue(dataKey, data);
              jumpPurchase = "NO";
            }
          });
        }
        while (jumpPurchase != "YES" && jumpPurchase != "NO") {
          jumpPurchase = prompt("Allows the character to jump an extra time.\n\nPrice: 200 coins\n\nEnter YES to purchase this upgrade and NO to cancel.");
        }
        getKeyValue(dataKey, function (data) {
          coins = data.coins;
          if (jumpPurchase == "YES") {
            coins = data.coins -= 200;
            jumpAmount = (data.jumps += 1);
            setKeyValue(dataKey, data);
            jumpPurchase = "NO";
          }
        });
        if (mouseIsOver(interactColliders[1]) && mouseWentDown("leftButton")) {
          getKeyValue(dataKey, function (data) {
            coins = data.coins;
            if (data.coins - 100 >= 0) {
              livesPurchase = prompt("Allows the character to survive an extra death.\n\nPrice: 100 coins\n\nEnter YES to purchase this upgrade and NO to cancel.");
            } else {
              prompt("Allows the character to survive an extra death.\n\nPrice: 100 coins\n\nYou do not have enough coins to purchase this upgrade.");
            }
            if (livesPurchase == "YES") {
              coins = (data.coins -= 100);
              maxLives = (data.lives += 1);
              setKeyValue(dataKey, data);
              updateData(0);
              livesPurchase = "NO";
            }
          });
        }
        while (livesPurchase != "YES" && livesPurchase != "NO") {
          livesPurchase = prompt("Allows the character to survive an extra death.\n\nPrice: 100 coins\n\nEnter YES to purchase this upgrade and NO to cancel.");
        }
        getKeyValue(dataKey, function (data) {
          coins = data.coins;
          if (livesPurchase == "YES") {
            coins = (data.coins -= 100);
            maxLives = (data.lives += 1);
            setKeyValue(dataKey, data);
            updateData(0);
            livesPurchase = "NO";
          }
        });
      } else if ((mode == "settings")) {
        titleBar.shapeColor = rgb(202, 17, 54);
        if (titlePos.toFixed(2) > -74.99) {
          titlePos -= Math.abs((titlePos + 75) / 10);
        } else {
          titlePos = -75;
        }
        if (textOpacity.toFixed(2) < 0.99) {
          textOpacity += Math.abs((textOpacity - 1) / 30);
        } else {
          textOpacity = 1;
        }
        if (mouseIsOver(titleColliders[1]) && mouseWentDown("leftButton")) {
          startPos = 405;
          textOpacity = 0.0001;
          mode = "menu";
        }
        if (keys.length < 3 || keys == null || mouseIsOver(interactColliders[0]) && mouseWentDown("leftButton")) {
          if (keys != null && keys.length > 3) {
            keys = prompt("Enter the keys you would like to use to move your character.\n\nFollow the format: upKey, leftKey, downKey, rightKey.\n\nMake sure each key is separated by a comma with a space after it.", (((keys[0] + ", ") + keys[1] + ", ") + keys[2] + ", ") + keys[3]);
            keys = keys.match(/[^\s,]+(?=\s*,?)/g);
            playerData.keys = keys;
            setKeyValue(dataKey, playerData);
            textList = ["Use " + keys[0] + ", " + keys[1] + ", " + keys[2] + ", and " + keys[3] + " to move the player", "Run from the red bar to survive", ("Press " + keys[2] + " to use your the slam ability"), "Collect coins to purchase upgrades"];
          } else {
            keys = prompt("Invalid keys.\n\nThere must be four keys separated by commas with a space after each comma.\n\nExample: w, a, s, d", keys);
          }
        }
        if (mouseIsOver(interactColliders[1]) && mouseWentDown("leftButton")) {
          playerData.music = (musicToggle = !musicToggle);
          setKeyValue(dataKey, playerData);
          menuSongStarted = false;
          gameSongStarted = false;
          stopSound("assets/neon-gaming-128925.mp3");
          stopSound("assets/compressed-menu-music.mp3");
        }
        if (World.frameCount > 25) {
          if (!menuSongStarted) {
            if (musicToggle) {
              stopSound("assets/neon-gaming-128925.mp3");
              stopSound("assets/compressed-menu-music.mp3");
              playSound("assets/compressed-menu-music.mp3", true);
            }
            menuSongStarted = true;
          }
        }
      } else if ((mode == "play")) {
        titleBar.shapeColor = rgb(202, 17, 54);
        if (titlePos.toFixed(2) > -74.99) {
          titlePos -= Math.abs((titlePos + 75) / 10);
        } else {
          titlePos = -75;
        }
        if (!completed) {
          movement(character, ["", "", "", ""], titleBar);
          character.collide(titleBar);
          if (Math.round(character.x) > 180) {
            if (introOpacity.toFixed(2) < 0.99) {
              introOpacity += Math.abs((introOpacity - 1.25) / 30);
            } else {
              introOpacity = 1;
            }
          }
          character.x = Object.position_N(200, character.x, 15);
          if (character.x == 200) { completed = true }
        } else {
          if (xVelocity != 0 || character.x != 200) {
            if (!gameSongStarted) {
              if (musicToggle) {
                stopSound("assets/compressed-menu-music.mp3");
                stopSound("assets/neon-gaming-128925.mp3");
                playSound("assets/neon-gaming-128925.mp3", true);
              }
              gameSongStarted = true;
            }
            introOpacity = Object.position_N(0, introOpacity, 15);
            textOpacity = Object.position_N(1, textOpacity, 30);
            wallVelocity = maxVelocity + (character.x - wall.x) / 1000;
            if (wall.velocityX < wallVelocity) {
              wall.velocityX += Math.abs((wall.velocityX - wallVelocity) / 500);
            } else {
              wall.velocityX = wallVelocity;
            }
            originDistance = dist(200, 200, character.x, character.y) / 100;
            if (xVelocity > maxVelocity) {
              xVelocity = maxVelocity;
            }
          }
          camera.x = character.x + xVelocity;
          for (var z = 0; z < particles.length; z++) {
            (particles[z]).x = Object.position_N(1.5 * (World.frameCount - startValue) + camera.x + 50, (particles[z]).x, 8 * (z + 1)) + xVelocity;
            (particles[z]).y = Object.position_N(0.08 * Math.pow((World.frameCount - startValue) - 0, 2) + camera.y + 50, (particles[z]).y, 8 * (z + 1));
            particles[z].shapeColor = rgb(252, 184, 17, (particles[z]).lifetime / 60);
          }
          movement(character, keys, titleBar);
          managePlatforms(3);
          grid.x = camera.x - gridPos - xVelocity;
          if (gridPos > 15.75) {
            gridPos = 0;
          } else {
            gridPos += xVelocity / (120 / 15.75);
          }
          if (textOpacity != 0.0001) {
            miniCharacter.visible = true;
            minimapBackground.visible = true;
            minimapWorld.visible = true;
          }
          for (var c = 0; c < collectibles.length; c++) {
            if (character.isTouching(collectibles[c])) {
              startValue = World.frameCount;
              if (collectibles[c].type == "coin") {
                manageCoins(1, collectibles[c]);
              } else if ((collectibles[c].type == "gift")) {
                manageCoins(randomNumber(2, 5), collectibles[c]);
              }
              collectibles[c].destroy();
              miniCollectibles[c].destroy();
            }
          }
          /*
          if (character.isTouching(mystery)) {
            randomCoin = 0;
            if (mystery.visible == true) {
              test = World.frameCount;
              createParticles(camera.x, camera.y + 100, randomNumber(2, 5));
              mystery.nextFrame();
              miniMystery.nextFrame();
            }
          }
          */
          if (character.x < wall.x || character.isTouching(wall)) {
            if (lives != 1) {
              if (platforms[1] != undefined) {
                character.x = (platforms[1]).x;
              } else {
                character.x += platforms[0].width;
              }
              grid.x = character.x;
              character.y = -25;
              character.velocityY = 0;
              jumped = jumpAmount;
              xVelocity = 0;
              maxVelocity = 5;
              extraVelocity = 0;
              wall.velocityX = (character.x - wall.x) / 15;
              lives -= 1;
              updateData(0);
            } else {
              stopSound("assets/compressed-menu-music.mp3");
              stopSound("assets/neon-gaming-128925.mp3");
              character.visible = false;
              miniCharacter.visible = false;
              updateData(0);
              mode = "gameOver";
            }
          }
          if (character.y > 600) {
            if (lives != 1) {
              grid.x = character.x;
              character.y = -25;
              character.velocityY = 0;
              jumped = 0;
              xVelocity = 0;
              maxVelocity = 5;
              extraVelocity = 0;
              wall.velocityX = (character.x - wall.x) / 15;
              lives -= 1;
              updateData(0);
            } else {
              stopSound("assets/compressed-menu-music.mp3");
              stopSound("assets/neon-gaming-128925.mp3");
              character.visible = false;
              miniCharacter.visible = false;
              updateData(0);
              mode = "gameOver";
            }
          }
        }
      } else if ((mode == "gameOver")) {
        character.setVelocity(0, 0);
        wall.setVelocity(0, 0);
        textPos = Object.position_N(100, textPos, 30);
        wall.scale = Object.position_N(5, wall.scale, 30);
        if (wall.scale == 5) { platforms.destroyEach() }
        wall.x = Object.position_N(camera.x - xVelocity, wall.x, 30);
        titleBar.shapeColor = rgb(202, 17, 54, 5 - wall.scale + 0.0001);
        wall.shapeColor = rgb(202 - wall.scale * 37, 17, 54 - wall.scale * 8);
        minimapBackground.shapeColor = rgb(255, 255, 255, 5 - wall.scale + 0.0001);
        minimapWorld.shapeColor = rgb(200, 200, 200, 5 - wall.scale + 0.0001);
        platforms.setColorEach(rgb(202, 17, 54, 5 - wall.scale + 0.0001));
        if (mouseWentDown("leftButton")) {
          platforms.destroyEach();
          camera.x = 200;
          camera.y = 200;
          grid.x = 200;
          grid.y = 200;
          wall.x = -100;
          wall.y = 200;
          wall.width = 100;
          wall.height = 400;
          wall.scale = 1;
          wall.shapeColor = rgb(152, 17, 54);
          titlePos = -70;
          titleBar.x = 200;
          titleBar.y = 250;
          titleGoal = 250;
          startPos = 405;
          character.x = -50;
          character.y = 200;
          character.visible = true;
          character.mirrorX(1);
          character.setAnimation("characterRun");
          miniCharacter.visible = false;
          menuSongStarted = false;
          gameSongStarted = false;
          completed = false;
          extraVelocity = 0;
          maxVelocity = 5;
          xVelocity = 0;
          highestSpeed = 0;
          jumped = 0;
          maxLives = playerData.lives;
          lives = maxLives;
          introOpacity = 0.0001;
          textOpacity = 0.0001;
          textPos = 500;
          textIndex = -1;
          randomCoin = 0;
          extraCoins = 0;
          originDistance = 0;
          farthestDistance = 0;
          mode = "menu";
        }
      }
      drawSprites();
      if (mode == "play") {
        noStroke();
        textAlign(CENTER, CENTER);
        textFont(lexend);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(20);
        for (var f = 0; f < lives; f++) {
          ellipse(camera.x - 155 + 22 * f - xVelocity, 378.5, 20, 20);
        }
        fill(rgb(252, 184, 17, textOpacity));
        text("Coins: " + coins, camera.x + 100 - xVelocity, 375);
        minimapBackground.x = camera.x;
        minimapBackground.shapeColor = rgb(200, 200, 200, textOpacity);
        minimapWorld.x = camera.x;
        minimapWorld.shapeColor = rgb(255, 255, 255, textOpacity);
        fill(rgb(152, 17, 54, textOpacity));
        rect((((camera.x + 0) - (camera.x - wall.x) / 8) - xVelocity) - wall.width / 8, 55, wall.width / 8, wall.height / 8);
        miniCharacter.x = camera.x + 0;
        miniCharacter.y = (55 + character.y / 8) + miniCharacter.height / 8 / 2;
        if (collectibles.length != 0) {
          for (var r = 0; r < miniCollectibles.length; r++) {
            (miniCollectibles[r]).x = ((camera.x + 0) - ((camera.x - (collectibles[r]).x) / 8)) - 0;
            miniCollectibles[r].y = (55 + (collectibles[r]).y / 8) + miniCollectibles[r].height / 8 / 2;
          }
        }
        fill(rgb(202, 17, 54, textOpacity));
        for (var v = 0; v < platforms.length; v++) {
          rect(((camera.x + 0) - ((camera.x - platforms[v].x) / 8) - xVelocity) - platforms[v].width / 8 / 2, 55 + platforms[v].y / 8, platforms[v].width / 8, platforms[v].height / 8);
        }
        fill(rgb(255, 255, 255, textOpacity));
        text("Speed: " + Math.abs(xVelocity.toFixed(1)), (camera.x + 100) - xVelocity, 25);
        if ((dist(character.x, wall.y, wall.x, wall.y) / 100).toFixed(1) < 5) {
          fill(rgb(202, 17, 54, textOpacity));
        } else {
          fill(rgb(255, 255, 255, textOpacity));
        }
        text("Distance: " + (dist(character.x, wall.y, wall.x, wall.y) / 100).toFixed(1), camera.x - 100 - xVelocity, 25);
        fill(rgb(255, 255, 255, textOpacity));
        textSize(15);
        if (platforms[0] != undefined) {
          if (textIndex < 4 && textIndex >= 0) {
            text(textList[textIndex], (platforms[0]).x + 0, 125);
          }
        }
      } else if ((mode == "upgrades")) {
        noStroke();
        textAlign(CENTER, CENTER);
        textFont(lexend);
        fill(rgb(255, 255, 255, textOpacity));
        textSize(45);
        text("Back", 200, 315);
        textSize(30);
        text("Max Jumps", 150, 145);
        rect(275, 127.5, 50, 45);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(45);
        text(jumpAmount, 300, 145);
        fill(rgb(255, 255, 255, textOpacity));
        textSize(30);
        text("Max Lives", 150, 195);
        rect(275, 177.5, 50, 45);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(45);
        text(maxLives, 300, 195);
        fill(rgb(255, 255, 255, textOpacity));
        textSize(20);
        text("Click the boxes to interact", 200, 260);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(55);
        text("Upgrades", 200, 50);
        fill(rgb(255, 255, 255));
        textSize(15);
        text("Coins: " + coins, 200, startPos);
        if (mode == "upgrades") {
          startPos -= Math.abs((startPos - 375) / 30);
        } else {
          startPos += Math.abs((startPos - 405) / 10);
        }
      } else if ((mode == "settings")) {
        noStroke();
        textAlign(CENTER, CENTER);
        textFont(lexend);
        fill(rgb(255, 255, 255, textOpacity));
        textSize(45);
        text("Back", 200, 315);
        textSize(30);
        text("Keybinds", 150, 145);
        rect(275, 127.5, 50, 45);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(45);
        if (keys[0] == "up") {
          text("^", 300, 152.5);
        } else {
          text(keys[0], 300, 145);
        }
        fill(rgb(255, 255, 255, textOpacity));
        textSize(30);
        text("Music", 150, 195);
        rect(275, 177.5, 50, 45);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(30);
        if (musicToggle) {
          text("On", 300, 197.5);
        } else {
          text("Off", 300, 197.5);
        }
        fill(rgb(255, 255, 255, textOpacity));
        textSize(20);
        text("Click the boxes to interact", 200, 260);
        fill(rgb(202, 17, 54, textOpacity));
        textSize(55);
        text("Settings", 200, 50);
        fill(rgb(255, 255, 255));
        textSize(15);
        text("Visits: " + playerData.visits, 200, startPos);
        if (mode == "settings") {
          startPos -= Math.abs((startPos - 375) / 30);
        } else {
          startPos += Math.abs((startPos - 405) / 10);
        }
      } else if ((mode == "gameOver")) {
        noStroke();
        textAlign(CENTER, CENTER);
        textFont(lexend);
        fill(rgb(255, 255, 255, textPos / 100));
        textSize(45);
        text("Restart", camera.x - 0, textPos + 220);
        textSize(25);
        text("Highest Distance: " + farthestDistance.toFixed(1), camera.x - 0, textPos + 50);
        text("Highest Speed: " + highestSpeed.toFixed(1), camera.x - 0, textPos + 100);
        text("Coins Collected: " + extraCoins, camera.x - 0, textPos + 150);
        fill(rgb(202, 17, 54, textPos / 100));
        textSize(55);
        text("Game Over", camera.x - 0, textPos - 50);
      }
      if (titlePos != -75) {
        noStroke();
        textAlign(CENTER, CENTER);
        fill("#981136");
        textFont(lexend);
        fill(rgb(202, 17, 54));
        fill("White");
        textSize(90);
        fill("#CA1136");
        text("H", 60.5, (titlePos - 5) + 5 * sin(3 * World.frameCount + 350));
        text("o", 125.75, (titlePos - 5) + 5 * sin(3 * World.frameCount + 300));
        text("r", 174.5, (titlePos - 5) + 5 * sin(3 * World.frameCount + 250));
        text("i", 203.75, (titlePos - 5) + (5 * sin(3 * World.frameCount + 200)));
        text("z", 240.5, (titlePos - 5) + (5 * sin(3 * World.frameCount + 150)));
        text("o", 291, titlePos - 5 + (5 * sin(3 * World.frameCount + 100)));
        text("n", 345.25, titlePos - 5 + (5 * sin(3 * World.frameCount + 50)));
        textSize(45);
        fill(rgb(255, 255, 255, titlePos / 100));
        text("Upgrades", 200, 240);
        text("Settings", 200, 315);
        fill(rgb(255, 255, 255, titlePos / 100));
        textSize(20);
        if (window.getURLPath()[2] == "fcX0FPfMdGiG0SRO4_eBBytwC0b9bNrtkXSG2Sp89WA") {
          text("Original Version", 275, titlePos + 60);
        } else {
          text("Archived Version", 275, titlePos + 60);
        }
        fill(rgb(255, 255, 255));
        textSize(15);
        if (mode == "menu") {
          if (World.frameCount > 100) {
            startPos -= Math.abs((startPos - 375) / 30);
          } else if (mode != "menu") {
            startPos += Math.abs((startPos - 405) / 10);
          }
          text("Press space to start", 200 + 10 * cos(1.5 * World.frameCount), startPos);
        }
      }
      if (introOpacity.toFixed(2) != 0) {
        textAlign(CENTER, CENTER);
        textFont(lexend);
        fill(rgb(255, 255, 255, introOpacity));
        textSize(20);
        text("There's no going back now", character.x + 10 * sin(World.frameCount), 100 + 5 * sin(World.frameCount) * cos(2 * World.frameCount));
      }
    }

    function manageCoins(amount, object) {
      createParticles(object.x, object.y, amount);
      console.log(amount);
      extraCoins += amount;
      updateData(amount);
    }

    //controls for movement
    function movement(object, keybinds, platform) {
      var keyList = keybinds; //keybinds.split(", ");
      var gravity = 0.5;
      var bounciness = 0.25;
      var friction = 0.85;
      if (keyDown(keyList[2])) {
        gravity = 2;
      } else {
        gravity = 0.5;
      }
      if (keyWentDown(keyList[0])) {
        if (jumped != jumpAmount) {
          jumped += 1;
          object.velocityY = -10;
        }
      } else {
        object.velocityY += gravity;
      }
      object.velocityX = xVelocity;
      if (keyDown(keyList[1])) {
        object.setAnimation("characterRun");
        if (xVelocity.toFixed(2) != -(maxVelocity - 0.01)) {
          xVelocity -= Math.abs((xVelocity + maxVelocity) / 15);
        } else {
          xVelocity = -maxVelocity;
        }
        object.mirrorX(-1);
      } else if ((keyDown(keyList[3]))) {
        object.setAnimation("characterRun");
        if (xVelocity.toFixed(2) != maxVelocity - 0.01) {
          xVelocity += Math.abs((xVelocity - maxVelocity) / 15);
        } else {
          xVelocity = maxVelocity;
        }
        object.mirrorX(1);
        extraVelocity += 0.005;
      } else {
        if (xVelocity.toFixed(2) > 0) {
          xVelocity -= Math.abs((xVelocity - 0) / 8);
        } else if ((xVelocity.toFixed(2) < 0)) {
          xVelocity += Math.abs((xVelocity - 0) / 8);
        } else {
          xVelocity = 0;
        }
      }
      if ((Math.round(object.x) > 195 && Math.abs(Math.round(xVelocity)) < 1) && (object.isTouching(platform) || object.isTouching(platforms))) {
        object.setAnimation("characterIdle");
      }
      if (!keyDown(keyList[3])) {
        if (extraVelocity.toFixed(2) != 0.00) {
          extraVelocity -= Math.abs((extraVelocity - 0) / 10);
        } else {
          extraVelocity = 0;
        }
      }
      if (maxVelocity < 30) {
        maxVelocity = 5 + extraVelocity;
      }
      for (var n = 0; n < platforms.length; n++) {
        if (object.y < (platforms[n].y + platforms[n].height / 2)) {
          if (object.isTouching(platform) || object.isTouching(platforms[n])) {
            jumped = 0;
            if (!keyDown(keyList[3]) && !keyDown(keyList[1])) {
              object.velocityX *= friction;
            }
            object.velocityY *= bounciness;
          }
          object.bounceOff(platforms[n]);
          object.bounceOff(platform);
        } else {
          object.collide(platforms[n]);
          object.collide(platform);
        }
      }
    }

    function createParticles(x, y, amount) {
      for (var n = 0; n < amount; n++) {
        particle = createSprite(x, y, 25, 25);
        particle.lifetime = 60;
        particle.scale = randomNumber(2, 3) / 5;
        particle.depth = 5;
        particles.add(particle);
      }
    }

    //controls platform generation
    function managePlatforms(maxLength) {
      if (platforms.length < maxLength) {
        var lastPlatform = platforms[platforms.length - 1];
        var platformWidth = platforms.length == 0 ? 400 : randomNumber(lastPlatform.width - 50, lastPlatform.width + 100);
        var platform = createSprite(platforms.length == 0 ? 200 : lastPlatform.x + (lastPlatform.width / 2 + platformWidth / 2) + World.width / maxLength, platforms.length == 0 ? titleBar.y : randomNumber(lastPlatform.y / 2 + 100, 300), platformWidth, 50);
        platform.depth = 0;
        platform.shapeColor = rgb(202, 17, 54);
        if (textIndex > 3) {
          platform.showCollectible = randomNumber(0, 3) == 0 && platforms.length != 0 ? true : false;
          platform.changeSize = randomNumber(0, 5) == 0 && !platform.showCollectible ? true : false;
          platform.changeHeight = randomNumber(0, 5) == 0 && !platform.showCollectible ? true : false;
        }
        if (platform.showCollectible) { manageCollectibles(platform); }
        platforms.add(platform);
      }
      for (var i = 0; i < platforms.length; i++) {
        if ((platforms[i]).changeSize) { platforms[i].width -= sin(World.frameCount) }
        if ((platforms[i]).changeHeight) { platforms[i].y -= sin(World.frameCount) }
        if ((platforms[i]).x + (platforms[i]).width / 2 < camera.x - 200) {
          if (textIndex < textList.length) { textIndex++ }
          if ((platforms[i]).showCollectible && collectibles[0] != undefined && collectibles.length == maxLength) { collectibles[0].destroy(), miniCollectibles[0].destroy() }
          platforms[i].showCollectible = false;
          platforms[i].destroy();
        }
      }
      for (var c = 0; c < collectibles.length; c++) {
        (collectibles[c]).width = 25 * cos(2 * World.frameCount);
        (collectibles[c]).y -= 0.25 * sin(5 * World.frameCount);
      }
    }
    function manageCollectibles(platform) {
      if (randomNumber(0, 10) == 0 ? true : false) {
        var randomFrame = randomNumber(1, 14);
        var collectible = createSprite(randomNumber(platform.x - platform.width / 2 + 25, platform.x + platform.width / 2 - 25), platform.y - 50);
        collectible.setAnimation("gifts");
        collectible.pause();
        collectible.setFrame(randomFrame);
        collectible.type = random(["gift", "gift1", "gift2"]);
        collectibles.add(collectible);
        var miniCollectible = createSprite(200, 200);
        miniCollectible.setAnimation("gifts");
        miniCollectible.pause();
        miniCollectible.setFrame(randomFrame);
        miniCollectible.depth = 0;
        miniCollectible.scale = 1 / 8;
        miniCollectibles.add(miniCollectible);
      } else {
        var collectible = createSprite(randomNumber(platform.x - platform.width / 2 + 25, platform.x + platform.width / 2 - 25), platform.y - 50);
        collectible.setAnimation("coin");
        collectible.type = "coin";
        collectibles.add(collectible);
        var miniCollectible = createSprite(200, 200);
        miniCollectible.setAnimation("coin");
        miniCollectible.depth = 0;
        miniCollectible.scale = 1 / 8;
        miniCollectibles.add(miniCollectible);
      }
    }

    function updateData(amount) {
      coins = playerData.coins += amount;
      playerData.lives = maxLives;
      farthestDistance = playerData.topDistance = originDistance > playerData.topDistance ? originDistance : playerData.topDistance;
      highestSpeed = playerData.topSpeed = maxVelocity > playerData.topSpeed ? maxVelocity : playerData.topSpeed;
      setKeyValue(dataKey, playerData);
    }

    // -----
    try { window.draw = draw; } catch (e) { }
    switch (stage) {
      case 'preload':
        if (preload !== window.preload) { preload(); }
        break;
      case 'setup':
        if (setup !== window.setup) { setup(); }
        break;
    }
  }
  window.wrappedExportedCode = wrappedExportedCode;
  wrappedExportedCode('preload');
};

window.setup = function () {
  window.wrappedExportedCode('setup');
};
