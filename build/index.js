"use strict";
// hack: since its much easier to just use a static page and bundle the ts inside, i cant really use exports/import (at least idk how)
// so instead modules are defined inside index.html and we just reference the values stored (i.e. WORDS from words.ts)
// dont question it
class Game {
    constructor(size) {
        this.grid = []; // ts doesnt have char, so each string represents a row
        this.proposedSolution = [];
        this.goals = [];
        this.size = size;
        for (let i = 0; i < size; i++)
            this.grid.push(" ".repeat(size));
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
                input.pattern = "^[sS]{1}$";
                input.required = true;
                input.title = "";
                let icon = document.createElement('div');
                icon.id = `cell-${i}-${j}-icon`;
                icon.classList.add('icon');
                parent.appendChild(input);
                parent.appendChild(icon);
                this.content.appendChild(parent);
            }
            gridArea += '"\n';
        }
        this.content.style.marginLeft = "10px";
        this.content.style.gridTemplateAreas = gridArea;
        this.createSolution();
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
                        let inWhitelist = true;
                        blacklist.forEach(b => {
                            if (b.x == p.x && b.y == p.y) {
                                inWhitelist = false;
                                return;
                            }
                        });
                        if (inBounds && inWhitelist)
                            break;
                    }
                    this.markAsWall(p);
                }
                // setup the start and end words
                let wStart = this.proposedSolution[0];
                let wEnd = this.proposedSolution[this.proposedSolution.length - 1];
                this.proposedSolution.forEach(w => this.write(w));
                //this.write(wStart);
                //this.write(wEnd);
                this.goals = this.goals.concat(this.getWordSpan(wStart)).concat(this.getWordSpan(wEnd));
                this.goals.forEach(p => this.markAsGoal(p));
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
    getWordSpan(w) {
        let out = [];
        let copy = { x: w.start.x, y: w.start.y };
        for (let i = 0; i < w.word.length; i++) {
            out.push(copy);
            copy = this.add(copy, w.dir);
        }
        return out;
    }
    getCell(p) {
        return document.getElementById('cell-' + p.x + '-' + p.y);
    }
    getCellInput(p) {
        return document.getElementById('cell-' + p.x + '-' + p.y + '-input');
    }
    getCellIcon(p) {
        return document.getElementById('cell-' + p.x + '-' + p.y + '-icon');
    }
    markAsGoal(p) {
        let h = this.getCell(p);
        h.classList.add('goal');
        // for some reason, doing this via the provided api (document.createElement...) doesnt properly calculate the bounds of the svg
        this.getCellIcon(p).innerHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="rgba(65,176,110,1)">
                <path d="M2 3H21.1384C21.4146 3 21.6385 3.22386 21.6385 3.5C21.6385 3.58701 21.6157 3.67252 21.5725 3.74807L18 10L21.5725 16.2519C21.7095 16.4917 21.6262 16.7971 21.3865 16.9341C21.3109 16.9773 21.2254 17 21.1384 17H4V22H2V3Z"></path>
            </svg>;`;
    }
    markAsWall(p) {
        this.getCell(p).classList.add('wall');
    }
    inBounds(p) {
        return p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size;
    }
    add(p1, p2) {
        return { x: p1.x + p2.x, y: p1.y + p2.y };
    }
    sub(p1, p2) {
        return { x: p1.x - p2.x, y: p1.y - p2.y };
    }
    mul(p1, p2) {
        return { x: p1.x * p2.x, y: p1.y * p2.y };
    }
    mag(p1) {
        return Math.sqrt(p1.x * p1.x + p1.y * p1.y);
    }
    rand(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
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
    const game = new Game(12);
});
