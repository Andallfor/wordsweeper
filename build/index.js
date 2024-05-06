"use strict";
// hack: since its much easier to just use a static page and bundle the ts inside, i cant really use exports/import (at least idk how)
// so instead modules are defined inside index.html and we just reference the values stored (i.e. WORDS from words.ts)
// dont question it
let game;
class Game {
    constructor(size) {
        this.proposedSolution = [];
        this.goals = [];
        this.cells = [];
        this.walls = [];
        this.lettersCount = 0;
        this.undoCount = 0;
        this.size = size;
        this.content = document.getElementById('crossword-grid');
        let gridArea = '';
        for (let i = 0; i < size; i++) { // yes
            gridArea += '"';
            for (let j = 0; j < size; j++) {
                let hash = (i * size + j);
                gridArea += "" + hash + " ";
                // cant use innerhtml, causes this.content to become stale i think
                let parent = document.createElement('div');
                parent.id = `cell-${i}-${j}`;
                parent.classList.add('cell', 'empty');
                let input = document.createElement('input');
                input.id = `cell-${i}-${j}-input`;
                input.classList.add('input');
                input.minLength = 1;
                input.maxLength = 1;
                input.type = "text";
                input.required = true;
                input.title = "";
                input.onchange = this.onInput;
                input.setAttribute('onclick', 'this.select()');
                let icon = document.createElement('div');
                icon.id = `cell-${i}-${j}-icon`;
                icon.classList.add('icon');
                icon.appendChild(document.createElement('p'));
                parent.appendChild(input);
                parent.appendChild(icon);
                this.content.appendChild(parent);
            }
            gridArea += '"\n';
        }
        this.content.style.marginLeft = "10px";
        this.content.style.gridTemplateAreas = gridArea;
        document.getElementById('sol-sol').onclick = this.showSolution;
        this.createSolution();
        this.timeElement = document.getElementById('time');
        // start main loop
        setInterval(this.loop, 33); // 30 fps
    }
    showSolution() {
        game._showSolution();
    }
    _showSolution() {
        for (let i = 1; i < this.proposedSolution.length - 1; i++)
            this.highlight(this.proposedSolution[i]);
    }
    loop() {
        let t = window.performance.now();
        let mil = ("" + (t % 1000)).padStart(3, '0');
        let sec = ("" + (Math.floor(t / 1000) % 60)).padStart(2, '0');
        let min = ("" + (Math.floor(t / 60000))).padStart(2, '0');
        let timeString = min + ":" + sec + "." + mil;
        if (this.timeElement == null)
            this.timeElement = document.getElementById('time');
        else
            this.timeElement.innerText = timeString;
    }
    onInput(event) {
        game._onInput(event); // let _onInput have proper context
    }
    _onInput(event) {
        event = event;
        let target = event.currentTarget;
        let cell = target.parentElement;
        let _p = cell.id.split('-');
        let p = { x: +_p[1], y: +_p[2] };
        let c = Object.assign(Object.assign({}, p), { w: target.value.toLowerCase() });
        if (target.value == "") { // removing a value
            for (let i = 0; i < this.cells.length; i++) {
                let _c = this.cells[i];
                if (_c.x == p.x && _c.y == p.y) {
                    this.cells.splice(i, 1);
                    break;
                }
            }
            this.markCell(c, "empty");
            this.undoCount++;
            this.lettersCount--;
        }
        else { // adding/replacing a value
            let exists = false; // replace
            for (let i = 0; i < this.cells.length; i++) {
                let _c = this.cells[i];
                if (_c.x == p.x && _c.y == p.y) {
                    this.cells[i].w = target.value.toLowerCase();
                    exists = true;
                    this.undoCount++;
                    break;
                }
            }
            if (!exists) { // add new
                this.cells.push(c);
                this.lettersCount++;
            }
            this.markCellValidity(c);
        }
        // check neighbors (not self)
        this.checkWordDir(p, { x: -1, y: 0 });
        this.checkWordDir(p, { x: 1, y: 0 });
        this.checkWordDir(p, { x: 0, y: -1 });
        this.checkWordDir(p, { x: 0, y: 1 });
        document.getElementById('letters').innerText = "Letters: " + this.lettersCount;
        document.getElementById('undo').innerText = "Deletes: " + this.undoCount;
    }
    markCellValidity(c) {
        let vert = this.getConnectingLetters(c, { x: -1, y: 0 }).split("").reverse().join("") + c.w + this.getConnectingLetters(c, { x: 1, y: 0 });
        let horz = this.getConnectingLetters(c, { x: 0, y: -1 }).split("").reverse().join("") + c.w + this.getConnectingLetters(c, { x: 0, y: 1 });
        if (vert.length == 1 && horz.length == 1)
            this.markCell(c, 'invalid');
        else {
            let isVertValid = this.isValidWord(vert);
            let isHorzValid = this.isValidWord(horz);
            let vTag = isVertValid ? 'valid' : 'invalid';
            let hTag = isHorzValid ? 'valid' : 'invalid';
            if (vert.length == 1)
                this.markCell(c, hTag); // only check horz
            else if (horz.length == 1)
                this.markCell(c, vTag); // only check vert
            else { // at an intersection of two words
                if (isVertValid && isHorzValid)
                    this.markCell(c, 'valid');
                else if (isVertValid || isHorzValid)
                    this.markCell(c, 'mixed');
                else
                    this.markCell(c, 'invalid');
            }
        }
    }
    isValidWord(s) {
        if (s.length < 3)
            return false;
        return WORDS.includes(s.toLowerCase());
    }
    checkWordDir(p, dir) {
        let copy = { x: p.x, y: p.y };
        while (true) {
            copy = this.add(copy, dir);
            if (!this.inBounds(copy))
                break;
            let c = this.tryGetCell(copy);
            if (c == null)
                break;
            this.markCellValidity(c);
        }
    }
    markCell(p, tag) {
        let cell = this.getCell(p);
        if (cell.classList.contains('wall') || cell.classList.contains('goal'))
            return;
        // shush
        cell.classList.replace('valid', tag);
        cell.classList.replace('invalid', tag);
        cell.classList.replace('empty', tag);
        cell.classList.replace('mixed', tag);
    }
    getConnectingLetters(p, dir) {
        let out = "";
        let copy = { x: p.x, y: p.y };
        while (true) {
            copy = this.add(copy, dir);
            if (!this.inBounds(copy))
                break;
            let c = this.tryGetCell(copy);
            if (c == null)
                break;
            out += c.w;
        }
        return out;
    }
    tryGetCell(p) {
        let out = null;
        this.cells.forEach(c => {
            if (c.x == p.x && c.y == p.y) {
                out = c;
                return;
            }
        });
        return out;
    }
    createSolution() {
        // create solution (just brute force a solution lol)
        for (let generationCount = 0; generationCount < 200; generationCount++) {
            let solutionCount = this.rand(5, 10);
            // should convert to Cell?
            let position = { x: this.rand(2, this.size - 2), y: this.rand(2, this.size - 2) };
            let interChar = "";
            let blacklist = [];
            let prevDir = Math.random() < 0.5 ? { x: 0, y: 1 } : { x: 1, y: 0 };
            let tempWords = [];
            let whitelist = [];
            let shouldRestart = false;
            for (let n = 0; n < solutionCount; n++) {
                let word = null;
                // try and find a valid word
                for (let attempt = 0; attempt < 20; attempt++) {
                    word = this.wordThroughPoint(position, interChar, blacklist, { x: prevDir.y, y: prevDir.x });
                    if (word != null)
                        break;
                }
                if (word == null) {
                    shouldRestart = true;
                    break;
                }
                else {
                    // found valid word, update for next iteration
                    if (tempWords.length > 0) {
                        // copy previous word into blacklist
                        let last = tempWords[tempWords.length - 1];
                        blacklist = blacklist.concat(this.getWordSpan(last));
                    }
                    tempWords.push(word);
                    // now get whitelist
                    let copy = { x: word.start.x, y: word.start.y };
                    whitelist = [];
                    for (let i = 0; i < word.word.length; i++) {
                        if (!this.hasNeighbor(copy, blacklist))
                            whitelist.push(Object.assign(Object.assign({}, copy), { w: word.word.charAt(i) }));
                        copy = this.add(copy, word.dir);
                    }
                    if (whitelist.length == 0) {
                        shouldRestart = true;
                        break;
                    }
                    let inter = whitelist[this.rand(0, whitelist.length)];
                    blacklist.push(position);
                    position = { x: inter.x, y: inter.y };
                    interChar = inter.w;
                    prevDir = { x: prevDir.y, y: prevDir.x };
                }
            }
            if (!shouldRestart) {
                this.proposedSolution = tempWords;
                // now generate walls
                blacklist = blacklist.concat(this.getWordSpan(this.proposedSolution[this.proposedSolution.length - 1]));
                let walLCount = this.rand(10, 20);
                for (let i = 0; i < walLCount; i++) {
                    let p = { x: -1, y: -1 };
                    while (true) {
                        p = { x: this.rand(0, this.size), y: this.rand(0, this.size) };
                        let inBounds = this.inBounds(p);
                        let inWhitelist = !this.contains(p, blacklist);
                        if (inBounds && inWhitelist)
                            break;
                    }
                    this.markAsWall(p);
                }
                // setup the start and end words
                let wStart = this.proposedSolution[0];
                let wEnd = this.proposedSolution[this.proposedSolution.length - 1];
                this.cells = this.cells.concat(this.getCellSpan(wStart)).concat(this.getCellSpan(wEnd));
                //this.proposedSolution.forEach(w => this.write(w));
                this.write(wStart);
                this.write(wEnd);
                this.goals = this.goals.concat(this.getWordSpan(wStart)).concat(this.getWordSpan(wEnd));
                this.goals.forEach(p => this.markAsGoal(p));
                // generate stars
                let starCount = this.rand(3, 6);
                for (let i = 0; i < starCount; i++) {
                    let p = { x: -1, y: -1 };
                    while (true) {
                        p = blacklist[this.rand(0, blacklist.length)];
                        if (!this.contains(p, this.goals))
                            break;
                    }
                    this.markAsStar(p);
                }
                // update UI
                document.getElementById('sol-letters').innerText = 'Letters: ' + (blacklist.length - wStart.word.length - wEnd.word.length);
                break;
            }
        }
    }
    // note that this will end only trying to intersect the first occurrence but whatever
    wordThroughPoint(p, char, blacklist, forceDir = { x: 0, y: 0 }) {
        let dir = forceDir;
        if (dir.x == 0 && dir.y == 0)
            dir = Math.random() < 0.5 ? { x: 0, y: 1 } : { x: 1, y: 0 };
        // figure out how far we can go in the +/- neg directions
        let pos = this.getExtent(p, dir, blacklist);
        let neg = this.getExtent(p, this.mul(dir, { x: -1, y: -1 }), blacklist);
        let w = null;
        let wordGenCount = 0;
        while (w == null) {
            // encourage shorter words
            w = this.getRandWord(Math.max(3, Math.floor(Math.random() * (pos + neg + 1))), { x: pos, y: neg }, char);
            wordGenCount++;
            if (wordGenCount > 15)
                return null;
        }
        let lineInd = this.mag(this.mul(p, dir));
        let offset = 0;
        if (char == "") {
            // bounds between other words
            let min = lineInd - neg;
            let max = lineInd + pos - w.length;
            // bounds with word intersecting target point
            min = Math.max(0, lineInd - w.length + 1);
            max = Math.min(this.size - w.length, lineInd);
            offset = this.rand(min, max);
        }
        else {
            let intersection = w.indexOf(char);
            offset = lineInd - intersection;
        }
        if (dir.x != 0)
            return { start: { x: offset, y: p.y }, word: w, dir: dir };
        else
            return { start: { x: p.x, y: offset }, word: w, dir: dir };
    }
    getExtent(p, dir, blacklist) {
        let copy = { x: p.x, y: p.y };
        let length = -1;
        while (this.inBounds(copy)) {
            copy = this.add(copy, dir);
            if (this.hasNeighbor(copy, blacklist)) {
                length--;
                break;
            } // gap of 1 to other words
            length++;
        }
        return length;
    }
    hasNeighbor(p, blacklist, dirs = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }]) {
        for (let i = 0; i < dirs.length; i++) {
            let c = this.add(p, dirs[i]);
            if (!this.inBounds(c))
                continue;
            for (let j = 0; j < blacklist.length; j++) {
                // Point is a type, not a class so dont have custom == override
                let _p = blacklist[j];
                if (_p.x == c.x && _p.y == c.y)
                    return true;
            }
        }
        return false;
    }
    write(w) {
        let p = { x: w.start.x, y: w.start.y };
        for (let i = 0; i < w.word.length; i++) {
            this.getCellInput(p).value = w.word.charAt(i);
            p = this.add(p, w.dir);
        }
    }
    highlight(w) {
        let p = { x: w.start.x, y: w.start.y };
        for (let i = 0; i < w.word.length; i++) {
            if (!this.contains(p, this.goals))
                this.getCellIcon(p).getElementsByTagName('p')[0].innerText = w.word.charAt(i);
            p = this.add(p, w.dir);
        }
    }
    getWordSpan(w) {
        let out = [];
        let copy = { x: w.start.x, y: w.start.y };
        for (let i = 0; i < w.word.length; i++) {
            out.push(copy);
            copy = this.add(copy, w.dir);
        }
        return out;
    }
    getCellSpan(w) {
        let out = [];
        let copy = { x: w.start.x, y: w.start.y };
        for (let i = 0; i < w.word.length; i++) {
            out.push({ x: copy.x, y: copy.y, w: w.word.charAt(i) });
            copy = this.add(copy, w.dir);
        }
        return out;
    }
    contains(p, list) {
        let out = false;
        list.forEach(x => {
            if (x.x == p.x && x.y == p.y) {
                out = true;
                return;
            }
        });
        return out;
    }
    getCell(p) { return document.getElementById('cell-' + p.x + '-' + p.y); }
    getCellInput(p) { return document.getElementById('cell-' + p.x + '-' + p.y + '-input'); }
    getCellIcon(p) { return document.getElementById('cell-' + p.x + '-' + p.y + '-icon'); }
    markAsGoal(p) {
        let h = this.getCell(p);
        h.classList.add('goal');
        // for some reason, doing this via the provided api (document.createElement...) doesnt properly calculate the bounds of the svg
        this.getCellIcon(p).innerHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="rgba(65,176,110,1)">
                <path d="M2 3H21.1384C21.4146 3 21.6385 3.22386 21.6385 3.5C21.6385 3.58701 21.6157 3.67252 21.5725 3.74807L18 10L21.5725 16.2519C21.7095 16.4917 21.6262 16.7971 21.3865 16.9341C21.3109 16.9773 21.2254 17 21.1384 17H4V22H2V3Z"></path>
            </svg>`;
    }
    markAsWall(p) {
        this.getCell(p).classList.add('wall');
        this.walls.push(p);
    }
    markAsStar(p) {
        this.getCellIcon(p).innerHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="rgba(255,191,0,1)">
                <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"></path>
            </svg>`;
    }
    inBounds(p) { return p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size; }
    add(p1, p2) { return { x: p1.x + p2.x, y: p1.y + p2.y }; }
    sub(p1, p2) { return { x: p1.x - p2.x, y: p1.y - p2.y }; }
    mul(p1, p2) { return { x: p1.x * p2.x, y: p1.y * p2.y }; }
    mag(p1) { return Math.sqrt(p1.x * p1.x + p1.y * p1.y); }
    rand(min, max) { return Math.floor(Math.random() * (max - min) + min); }
    getRandWord(maxLength, buffer = { x: 100, y: 100 }, char = "", iter = 10) {
        let c = 0;
        while (true) {
            let n = this.rand(0, WORDS.length);
            if (WORDS[n].length < maxLength && WORDS[n].length >= 3) {
                if (char == "")
                    return WORDS[n];
                else {
                    let ind = WORDS[n].indexOf(char); // TODO: have it go through all occurrences of substring instead of just first?
                    if (ind == -1)
                        continue;
                    if (WORDS[n].length - ind > buffer.x)
                        continue;
                    if (ind > buffer.y)
                        continue;
                    return WORDS[n];
                }
            }
            c++;
            if (c > iter)
                return null;
        }
    }
}
window.addEventListener('load', function () {
    game = new Game(12);
});
