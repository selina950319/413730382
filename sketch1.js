let player;
let bullets = [];
let monsters = [];
let score = 0;
let gameOver = false;
let stars = [];
let clouds = [];
let buildings = [];
let particles = [];
let isMousePressed = false;
let maxMonsters = 10;

let backgroundColors;
let currentBgIndex = 0;
let lastBgChangeTime = 0;
let bgTransitionProgress = 0;
let isTransitioning = false;
let nextBgIndex = 1;

let isFullscreen = false;

// 星星類別
class Star {
    constructor() {
        this.reset();
        this.y = random(height);
    }

    reset() {
        this.x = random(width);
        this.y = -5;
        this.size = random(1, 3);
        this.speed = random(0.5, 2);
        this.brightness = random(100, 255);
        this.twinkleSpeed = random(0.02, 0.05);
    }

    update() {
        this.y += this.speed;
        if (this.y > height) {
            this.reset();
        }
        this.brightness = 150 + sin(frameCount * this.twinkleSpeed) * 105;
    }

    display() {
        noStroke();
        let currentBg = backgroundColors[currentBgIndex];
        let starBrightness = this.brightness;
        if (isTransitioning) {
            starBrightness = lerp(this.brightness, random(100, 255), bgTransitionProgress);
        }
        fill(starBrightness);
        ellipse(this.x, this.y, this.size);
    }
}

// 玩家類別
class Player {
    constructor() {
        this.x = width/2 - 25;
        this.y = height/2 - 25;
        this.size = 50;
        this.speed = 5;
        this.color = color(255, 0, 0);
        this.shootCooldown = 0;
        this.shootDelay = 5;     // 更快的射擊速度
        this.bulletCount = 8;    // 保持 8 發子彈
        this.spreadAngle = PI/4; // 縮小散射角度
        this.health = 100;
        this.maxHealth = 100;
        this.isInvincible = false;
        this.invincibleTime = 1500;
        this.lastHitTime = 0;
        this.isHappy = true;
    }

    move() {
        let dx = 0;
        let dy = 0;

        // 檢測按鍵輸入
        if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) dx -= 1;  // A or LEFT
        if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) dx += 1; // D or RIGHT
        if (keyIsDown(87) || keyIsDown(UP_ARROW)) dy -= 1;    // W or UP
        if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) dy += 1;  // S or DOWN

        // 如果是斜向移動，進行速度標準化
        if (dx !== 0 && dy !== 0) {
            // 使用畢氏定理來標準化速度
            let normalizer = 1 / sqrt(2);
            dx *= normalizer;
            dy *= normalizer;
        }

        // 應用速度
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // 限制在畫面範圍內
        this.x = constrain(this.x, 0, width - this.size);
        this.y = constrain(this.y, 0, height - this.size);
    }

    display() {
        if (this.isInvincible) {
            let timeSinceHit = millis() - this.lastHitTime;
            if (timeSinceHit > this.invincibleTime) {
                this.isInvincible = false;
            } else if (floor(timeSinceHit / 50) % 2 === 0) {
                return;
            }
        }

        // 發光效果
        noStroke();
        for(let i = 0; i < 5; i++) {
            fill(255, 100, 100, 20 - i * 4);
            ellipse(this.x + this.size/2, this.y + this.size/2, 
                   this.size + sin(frameCount * 0.05) * 5 + i * 10);
        }

        // 身體
        fill(this.color);
        rect(this.x, this.y, this.size, this.size, 10);

        // 眼睛和表情
        fill(255);
        ellipse(this.x + 15, this.y + 20, 12, 12);
        ellipse(this.x + 35, this.y + 20, 12, 12);

        fill(0);
        let eyeX = constrain(mouseX - (this.x + this.size/2), -3, 3);
        let eyeY = constrain(mouseY - (this.y + this.size/2), -3, 3);
        ellipse(this.x + 15 + eyeX, this.y + 20 + eyeY, 6, 6);
        ellipse(this.x + 35 + eyeX, this.y + 20 + eyeY, 6, 6);

        stroke(0);
        noFill();
        if (this.health > 50) {
            arc(this.x + 25, this.y + 35, 20, 10, 0, PI);
        } else {
            arc(this.x + 25, this.y + 40, 20, 10, PI, TWO_PI);
        }

        this.displayHealthBar();
    }

    displayHealthBar() {
        fill(100);
        rect(this.x, this.y - 20, this.size, 8);
        
        let healthColor = color(
            map(this.health, 0, this.maxHealth, 255, 0),
            map(this.health, 0, this.maxHealth, 0, 255),
            0
        );
        fill(healthColor);
        rect(this.x, this.y - 20, this.size * (this.health/this.maxHealth), 8);
    }

    shoot(targetX, targetY) {
        if (this.shootCooldown <= 0) {
            let baseAngle = atan2(targetY - (this.y + this.size/2), 
                                targetX - (this.x + this.size/2));
            
            // 簡化的散射模式
            for (let i = 0; i < this.bulletCount; i++) {
                let angle = baseAngle + this.spreadAngle * (i / (this.bulletCount - 1) - 0.5);
                
                // 固定的明亮顏色
                let bulletColor = color(255, 255, 0);
                
                // 創建主要子彈
                let bullet = new Bullet(
                    this.x + this.size/2, 
                    this.y + this.size/2, 
                    angle,
                    bulletColor,
                    15  // 固定且更快的速度
                );
                bullets.push(bullet);
            }
            
            this.shootCooldown = this.shootDelay;
        }
    }

    update() {
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        if (isMousePressed && !gameOver) {
            this.shoot(mouseX, mouseY);
        }
        this.move();
    }

    takeDamage(damage) {
        if (this.isInvincible) return;
        
        this.health -= damage;
        this.isInvincible = true;
        this.lastHitTime = millis();
        this.isHappy = false;

        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.x + this.size/2,
                this.y + this.size/2,
                random(-5, 5),
                random(-5, 5),
                color(255, 0, 0)
            ));
        }

        translate(random(-5, 5), random(-5, 5));

        if (this.health <= 0) {
            this.health = 0;
            gameOver = true;
            
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(
                    this.x + this.size/2,
                    this.y + this.size/2,
                    random(-8, 8),
                    random(-8, 8),
                    color(255, 0, 0)
                ));
            }
        }
    }
}

// 子彈類別
class Bullet {
    constructor(x, y, angle, bulletColor, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.angle = angle;
        this.size = 8;
        this.color = bulletColor;
        this.trail = [];
        this.trailLength = 5;    // 固定尾跡長度
    }

    move() {
        // 簡化的直線運動
        this.x += cos(this.angle) * this.speed;
        this.y += sin(this.angle) * this.speed;
        
        // 更新尾跡
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
    }

    display() {
        // 繪製尾跡
        noStroke();
        for (let i = 0; i < this.trail.length; i++) {
            let alpha = map(i, 0, this.trail.length, 50, 255);
            let size = map(i, 0, this.trail.length, 2, this.size);
            fill(255, 255, 0, alpha);
            ellipse(this.trail[i].x, this.trail[i].y, size);
        }

        // 繪製子彈本體
        fill(255, 255, 0);
        ellipse(this.x, this.y, this.size);
        
        // 簡單的發光效果
        fill(255, 255, 0, 100);
        ellipse(this.x, this.y, this.size * 1.5);
    }

    isOffscreen() {
        return (this.x < -50 || this.x > width + 50 || 
                this.y < -50 || this.y > height + 50);
    }
}

// 怪物類別
class Monster {
    constructor() {
        this.size = random(30, 50);
        this.speed = random(1, 2);
        this.health = 80 + this.size;
        this.maxHealth = this.health;
        this.damage = 20;
        
        // 隨機顏色
        this.color = color(
            random(100, 150),
            random(0, 50),
            random(100, 150)
        );
        
        // 眼睛動畫參數
        this.blinkTimer = random(100);
        this.eyeSize = this.size * 0.2;
        
        // 觸手參數
        this.tentacles = [];
        for(let i = 0; i < 6; i++) {
            this.tentacles.push({
                angle: i * PI/3,
                length: random(10, 20)
            });
        }
        
        // 從畫面邊緣隨機生成
        let side = floor(random(4));
        switch(side) {
            case 0: // 上
                this.x = random(width);
                this.y = -this.size;
                break;
            case 1: // 右
                this.x = width + this.size;
                this.y = random(height);
                break;
            case 2: // 下
                this.x = random(width);
                this.y = height + this.size;
                break;
            case 3: // 左
                this.x = -this.size;
                this.y = random(height);
                break;
        }
    }

    move(playerX, playerY) {
        let angle = atan2(playerY - this.y, playerX - this.x);
        this.x += cos(angle) * this.speed;
        this.y += sin(angle) * this.speed;
        
        // 更新觸手角度
        for(let tentacle of this.tentacles) {
            tentacle.angle += random(-0.1, 0.1);
        }
    }

    display() {
        push();
        translate(this.x + this.size/2, this.y + this.size/2);
        
        // 繪製觸手
        for(let tentacle of this.tentacles) {
            stroke(red(this.color), green(this.color), blue(this.color));
            strokeWeight(3);
            let x2 = cos(tentacle.angle + frameCount * 0.05) * tentacle.length;
            let y2 = sin(tentacle.angle + frameCount * 0.05) * tentacle.length;
            line(0, 0, x2, y2);
            noStroke();
            fill(this.color);
            ellipse(x2, y2, 8);
        }
        
        // 怪物主體
        noStroke();
        fill(this.color);
        ellipse(0, 0, this.size);
        
        // 眼睛
        this.blinkTimer += 0.1;
        let eyeHeight = (sin(this.blinkTimer) + 1) * 2;
        
        // 左眼
        fill(255);
        ellipse(-this.size/4, -this.size/6, this.eyeSize, this.eyeSize * eyeHeight);
        fill(0);
        ellipse(-this.size/4, -this.size/6, this.eyeSize/2);
        
        // 右眼
        fill(255);
        ellipse(this.size/4, -this.size/6, this.eyeSize, this.eyeSize * eyeHeight);
        fill(0);
        ellipse(this.size/4, -this.size/6, this.eyeSize/2);
        
        // 邪惡的��容
        stroke(0);
        noFill();
        strokeWeight(2);
        beginShape();
        vertex(-this.size/3, this.size/6);
        vertex(-this.size/6, this.size/3);
        vertex(0, this.size/6);
        vertex(this.size/6, this.size/3);
        vertex(this.size/3, this.size/6);
        endShape();
        
        pop();
        
        // 血條
        noStroke();
        fill(100);
        rect(this.x, this.y - 20, this.size, 5);
        fill(255, 0, 0);
        rect(this.x, this.y - 20, this.size * (this.health/this.maxHealth), 5);
    }

    hit(damage) {
        this.health -= damage;
        
        // 受傷特效
        for(let i = 0; i < 5; i++) {
            particles.push(new Particle(
                this.x + this.size/2,
                this.y + this.size/2,
                random(-3, 3),
                random(-3, 3),
                this.color
            ));
        }
        
        return this.health <= 0;
    }
}

// 粒子類別
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.alpha = 255;
        this.size = random(3, 8);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.alpha -= 5;
    }

    display() {
        noStroke();
        let c = color(red(this.color), green(this.color), blue(this.color), this.alpha);
        fill(c);
        ellipse(this.x, this.y, this.size);
    }

    isDead() {
        return this.alpha <= 0;
    }
}

// 雲類別
class Cloud {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = width + 200;
        this.y = random(50, height/3);
        this.width = random(100, 200);
        this.height = random(40, 80);
        this.speed = random(0.2, 0.5);
        this.alpha = random(100, 150);
    }

    update() {
        this.x -= this.speed;
        if (this.x < -this.width) {
            this.reset();
        }
    }

    display() {
        noStroke();
        fill(255, 255, 255, this.alpha);
        for(let i = 0; i < 5; i++) {
            ellipse(
                this.x + i * (this.width/5), 
                this.y + sin(i * 0.5) * 10, 
                this.width/3, 
                this.height
            );
        }
    }
}

class Building {
    constructor(x) {
        this.x = x;
        this.generateShape();
    }

    generateShape() {
        this.width = random(40, 80);
        this.height = random(100, 300);
        this.y = height - this.height;
        this.windows = [];
        
        // 生���窗戶
        let windowRows = floor(this.height / 30);
        let windowCols = floor(this.width / 20);
        
        for(let i = 0; i < windowRows; i++) {
            for(let j = 0; j < windowCols; j++) {
                if(random() < 0.7) { // 70% 機率有窗戶
                    this.windows.push({
                        x: j * 20 + 5,
                        y: i * 30 + 20,
                        lit: random() < 0.5 // 50% 機率亮著
                    });
                }
            }
        }
    }

    display() {
        // 建築物主體
        fill(20, 20, 50);
        noStroke();
        rect(this.x, this.y, this.width, this.height);
        
        // 窗戶
        for(let window of this.windows) {
            if(window.lit) {
                fill(255, 255, 150, 150); // 亮著的窗戶
            } else {
                fill(40, 40, 70); // 暗的窗戶
            }
            rect(this.x + window.x, this.y + window.y, 10, 15);
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // 初始化背景顏色
    backgroundColors = [
        {
            sky1: color(20, 0, 40),    // 夜晚
            sky2: color(40, 0, 80),
            moonColor: color(255, 255, 200)
        },
        {
            sky1: color(255, 100, 100),  // 黃昏
            sky2: color(255, 150, 50),
            moonColor: color(255, 200, 150)
        },
        {
            sky1: color(0, 0, 60),     // 深夜
            sky2: color(20, 0, 100),
            moonColor: color(200, 200, 255)
        },
        {
            sky1: color(70, 0, 90),    // 神秘紫
            sky2: color(130, 0, 150),
            moonColor: color(255, 200, 255)
        },
        {
            sky1: color(0, 40, 60),    // 深藍
            sky2: color(0, 80, 120),
            moonColor: color(200, 255, 255)
        }
    ];
    
    // 初始化其他元素
    for (let i = 0; i < 100; i++) {
        stars.push(new Star());
    }
    
    for (let i = 0; i < 5; i++) {
        clouds.push(new Cloud());
    }
    
    for (let x = 0; x < width; x += random(60, 100)) {
        buildings.push(new Building(x));
    }
    
    restartGame();
}

function draw() {
    // 檢查是否需要更換背景
    if (millis() - lastBgChangeTime > 10000) {  // 每10秒
        if (!isTransitioning) {
            isTransitioning = true;
            bgTransitionProgress = 0;
            nextBgIndex = (currentBgIndex + 1) % backgroundColors.length;
        }
    }

    // 繪製背景
    let currentBg = backgroundColors[currentBgIndex];
    let nextBg = backgroundColors[nextBgIndex];
    
    // 如果正在過渡
    if (isTransitioning) {
        bgTransitionProgress += 0.02;  // 控制過渡速度
        
        if (bgTransitionProgress >= 1) {
            currentBgIndex = nextBgIndex;
            isTransitioning = false;
            lastBgChangeTime = millis();
            bgTransitionProgress = 0;
        }
        
        // 計算過渡顏色
        let sky1 = lerpColor(currentBg.sky1, nextBg.sky1, bgTransitionProgress);
        let sky2 = lerpColor(currentBg.sky2, nextBg.sky2, bgTransitionProgress);
        let moonColor = lerpColor(currentBg.moonColor, nextBg.moonColor, bgTransitionProgress);
        
        // 繪製漸層背景
        for(let y = 0; y < height; y++){
            let inter = map(y, 0, height, 0, 1);
            let c = lerpColor(sky1, sky2, inter);
            stroke(c);
            line(0, y, width, y);
        }
        
        // 月亮
        noStroke();
        for(let i = 4; i >= 0; i--) {
            fill(red(moonColor), green(moonColor), blue(moonColor), 50);
            ellipse(width - 100, 100, 80 + i * 10);
        }
        fill(moonColor);
        ellipse(width - 100, 100, 80);
        
    } else {
        // 正常繪製當前背景
        for(let y = 0; y < height; y++){
            let inter = map(y, 0, height, 0, 1);
            let c = lerpColor(currentBg.sky1, currentBg.sky2, inter);
            stroke(c);
            line(0, y, width, y);
        }
        
        // 月亮
        noStroke();
        for(let i = 4; i >= 0; i--) {
            fill(red(currentBg.moonColor), green(currentBg.moonColor), blue(currentBg.moonColor), 50);
            ellipse(width - 100, 100, 80 + i * 10);
        }
        fill(currentBg.moonColor);
        ellipse(width - 100, 100, 80);
    }
    
    // 更新和顯示星星
    for (let star of stars) {
        star.update();
        star.display();
    }
    
    // 移動月亮到右上角
    noStroke();
    for(let i = 4; i >= 0; i--) {
        fill(255, 255, 200, 50);
        ellipse(width - 100, 100, 80 + i * 10);  // 改變 x 座標
    }
    fill(255, 255, 200);
    ellipse(width - 100, 100, 80);  // 改變 x 座標
    
    for (let cloud of clouds) {
        cloud.update();
        cloud.display();
    }
    
    for (let building of buildings) {
        building.display();
    }
    
    // 遊戲邏輯
    if (!gameOver) {
        // 生成怪物的邏輯
        if (frameCount % 120 === 0) {  // 每 2 秒檢查一次（原本是 180）
            // 根據分數增加同時生成的怪物數量
            let spawnCount = floor(score / 1000) + 1;  // 每 1000 分多生成一隻
            spawnCount = constrain(spawnCount, 1, 5);  // 最多一次生成 5 隻
            
            // 生成隻怪物
            for(let i = 0; i < spawnCount; i++) {
                if (monsters.length < maxMonsters) {
                    let monster = new Monster();
                    // 根據分數增加怪物屬性
                    let powerup = floor(score / 2000);  // 每 2000 分強化一次
                    monster.speed *= (1 + powerup * 0.1);  // 速度提升
                    monster.health *= (1 + powerup * 0.2);  // 生命值提升
                    monster.maxHealth = monster.health;
                    monsters.push(monster);
                }
            }
        }
        
        player.update();
        player.move();
        player.display();
        
        // 更新子彈
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].move();
            bullets[i].display();
            
            // 當子彈離開畫面時立即移除
            if (bullets[i].isOffscreen()) {
                bullets.splice(i, 1);
                continue;
            }
        }
        
        // 更新怪物
        for (let monster of monsters) {
            monster.move(player.x + player.size/2, player.y + player.size/2);
            monster.display();
        }
        
        // 碰撞檢測
        for (let i = bullets.length - 1; i >= 0; i--) {
            for (let j = monsters.length - 1; j >= 0; j--) {
                let b = bullets[i];
                let m = monsters[j];
                let d = dist(b.x, b.y, m.x + m.size/2, m.y + m.size/2);
                
                if (d < m.size/2 + b.size/2) {
                    if (m.hit(25)) {
                        monsters.splice(j, 1);
                        score += 100;
                    }
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
        
        // 玩家與怪物碰撞
        for (let monster of monsters) {
            let d = dist(
                player.x + player.size/2, 
                player.y + player.size/2,
                monster.x + monster.size/2, 
                monster.y + monster.size/2
            );
            if (d < (player.size + monster.size)/2) {
                player.takeDamage(monster.damage);
            }
        }
        
        // 更新粒子
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].display();
            if (particles[i].isDead()) {
                particles.splice(i, 1);
            }
        }
        
        // 生命值低於 40% 時警告效果
        if (player.health < player.maxHealth * 0.4) {
            let warningAlpha = (sin(frameCount * 0.1) + 1) * 50;
            fill(255, 0, 0, warningAlpha);
            rect(0, 0, width, height);
        }
        
        // 顯示UI
        fill(255);
        textSize(20);
        textAlign(LEFT);
        text('分數: ' + score, 10, 30);
        text('生命: ' + floor(player.health) + '/' + player.maxHealth, 10, 60);
        text('怪物: ' + monsters.length + '/' + maxMonsters, 10, 90);
        text('子彈: ' + bullets.length, 10, 120);
        text('波次: ' + (floor(score / 1000) + 1), 10, 150);
        text('碰撞傷害: 20', 10, 180);
        text('WASD 或 方向鍵移動', 10, 210);
        text('滑鼠點擊射擊', 10, 240);
        text('按 F 切換全螢幕', 10, 270);
    } else {
        // 遊戲結束畫面
        textAlign(CENTER);
        fill(255, 0, 0);
        textSize(64);
        text('遊戲結束', width/2, height/2);
        
        fill(255);
        textSize(32);
        text('最終分數: ' + score, width/2, height/2 + 50);
        text('按 R 重新開始', width/2, height/2 + 100);
        text('按 F 切換全螢幕', width/2, height/2 + 150);
    }

    // 使用文字作為浮水印
    push();
    textSize(min(width, height) * 0.1);  // 文字大小
    textAlign(CENTER, CENTER);
    fill(255, 30);  // 白色，30% 透明度
    text('淡江教科', width/2, height/2);
    pop();
}

function mousePressed() {
    isMousePressed = true;
    if (!gameOver && player) {
        player.shoot(mouseX, mouseY);
    }
}

function mouseReleased() {
    isMousePressed = false;
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        if (gameOver) {
            restartGame();
        }
    }
    
    // 按 F 鍵切換全螢幕
    if (key === 'f' || key === 'F') {
        toggleFullscreen();
    }
}

function restartGame() {
    player = new Player();
    bullets = [];
    monsters = [];
    particles = [];
    score = 0;
    gameOver = false;
    
    // 初始生成一波怪物
    for(let i = 0; i < 3; i++) {
        monsters.push(new Monster());
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // 重新計算建築物位置
    buildings = [];
    for (let x = 0; x < width; x += random(60, 100)) {
        buildings.push(new Building(x));
    }
}

function toggleFullscreen() {
    let fs = fullscreen();
    fullscreen(!fs);
    isFullscreen = !fs;
}