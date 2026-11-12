/* Bee Swarm Simulator (single-player recreation) - dev tools v4
 *
 * Works with the ORIGINAL index (limited: no gear unlock / teleport) or the
 * patched one (full). Load into a save, open the console, paste this file.
 * Press ` (backtick) to open the panel; you'll be asked for a name and password first. Everything is also available
 * as cheat.<name>(...) - run cheat.help() for the list.
 */
(function () {
    /* ------------------------------------------------------------------ */
    /*  find the game window                                              */
    /* ------------------------------------------------------------------ */
    function findGame() {
        const cands = [window, window.parent, window.top]
        try { for (let i = 0; i < window.frames.length; i++) cands.push(window.frames[i]) } catch (e) {}
        try { for (let i = 0; i < window.top.frames.length; i++) cands.push(window.top.frames[i]) } catch (e) {}
        for (const c of cands) { try { if (c && typeof c.exposeCheats === 'function') return c } catch (e) {} }
        return null
    }
    const W = findGame()
    if (!W) {
        console.error('[cheats] could not find the game (window.exposeCheats missing).\n' +
            '- Load into a save first (not just the main menu).\n' +
            '- Use the console frame dropdown (top-left) to pick the game frame, then paste again.\n' +
            '- If you used "New Window", paste into THAT window\'s console.')
        return
    }
    W.exposeCheats()
    const missingCore = ['player', 'items', 'effects', 'NPCs'].filter(k => !W[k])
    if (missingCore.length) {
        console.error('[cheats] game found but ' + missingCore.join(', ') + ' not exposed - load into a save first, then paste again.')
        return
    }

    const FALLBACK_BEES = 'basic,looker,music,fire,bubble,hasty,bomber,fuzzy,stubborn,spicy,vector,tadpole,buoyant,gummy,precise,rage,crimson,cobalt,photon,bumble,rascal,cool,rad,brave,windy,bucko,riley,commander,honey,tabby,diamond,demon,carpenter,lion,ninja,shy,demo,exhausted,shocked,frosty,baby,vicious,bear,puppy,festive,digital'.split(',')
    const FULL = !!(W.beeInfo && W.shops && W.fieldInfo)
    const BEES = () => W.beeInfo ? Object.keys(W.beeInfo) : FALLBACK_BEES
    const needFull = what => { console.warn('[cheats] ' + what + ' needs the patched index (beeInfo/shops/fieldInfo not exposed). Skipped.'); return 'needs patched index' }
    const P = () => W.player

    // original base stats, remembered so multipliers are relative to them
    const BASE = {
        walkSpeed: P().precomputedStats ? P().precomputedStats.walkSpeed : 150,
        jumpPower: P().precomputedStats ? P().precomputedStats.jumpPower : 10,
        beeAttack: P().precomputedStats ? P().precomputedStats.beeAttack : 1,
    }
    const state = { level: null, levelTimer: null }

    const eachBee = fn => {
        const hive = P().hive
        for (let y = 0; y < hive.length; y++) for (let x = 0; x < hive[y].length; x++) {
            const h = hive[y][x]
            if (h && h.type) fn(h, y, x)
        }
    }
    const recomputeStats = () => { try { P().computeStats() } catch (e) { console.warn('[cheats] computeStats failed', e) } }

    /* ------------------------------------------------------------------ */
    /*  the cheats                                                        */
    /* ------------------------------------------------------------------ */
    const cheat = {

        help() {
            console.log(Object.keys(cheat).join('\n'))
            console.log('Examples:\n cheat.setLevel(100)\n cheat.addSlots(20)\n cheat.damage(50)\n cheat.speed(3)\n cheat.jump(2)\n cheat.mutateAll()\n cheat.polarPower(500)\n cheat.nectars(24)\n cheat.goodEffects(2)\n cheat.badEffects(30)\n cheat.effectReport()\n cheat.health(1000)\n cheat.resetMobTimers()\n cheat.finishQuests()\n cheat.talkToAll(2)\n cheat.allItems(9999)')
        },

        /* ---- resources ---- */
        honey(n = 1e15) { P().honey = n; return n },
        addHoney(n = 1e12) { P().honey += n; return P().honey },
        fillBag() { P().pollen = P().capacity; return P().pollen },

        /* ---- items ---- */
        give(name, n = 100) {
            if (!W.items[name]) { console.warn('no such item:', name, '\nvalid:', Object.keys(W.items).join(', ')); return }
            W.items[name].amount += n
            return W.items[name].amount
        },
        setItem(name, n) { if (W.items[name]) W.items[name].amount = n },
        // n of EVERY item - includes every egg type (basic..mythic, gifted, star, and each
        // event bee's permanent egg such as digitalBeeEgg / festiveBeeEgg, which the game builds at load)
        allItems(n = 999) {
            let eggs = 0
            for (const k in W.items) {
                W.items[k].amount = n
                if ('cooldown' in W.items[k]) W.items[k].cooldown = 0
                if (/Egg$/.test(k)) eggs++
            }
            try { P().updateInventory() } catch (e) {}
            return Object.keys(W.items).length + ' items set to ' + n + ' (' + eggs + ' egg types incl.)'
        },
        eggList() { return Object.keys(W.items).filter(k => /Egg$/.test(k)) },
        clearCooldowns() { for (const k in W.items) if ('cooldown' in W.items[k]) W.items[k].cooldown = 0 },

        /* ---- bees ---- */
        beeTypes() { return BEES() },

        fillHive(type = 'all', opts = {}) {
            const o = Object.assign({ gifted: true, bond: 25600000, mutation: undefined, radioactive: undefined, slots: 50 }, opts)
            const types = BEES()
            const hive = P().hive
            let count = 0
            const pick = i => type === 'all' ? types[i % types.length] : type === 'random' ? types[(Math.random() * types.length) | 0] : type
            if (type !== 'all' && type !== 'random' && types.indexOf(type) < 0) { console.warn('unknown bee type:', type); return }
            for (let y = 0; y < hive.length; y++) for (let x = 0; x < hive[y].length; x++) {
                const h = hive[y][x]
                h.type = pick(count++); h.gifted = o.gifted; h.bond = o.bond
                h.mutation = o.mutation; h.radioactive = o.radioactive
            }
            while (count < o.slots) { P().addSlot(pick(count), o.gifted, o.bond, o.mutation, o.radioactive); count++ }
            P().updateHive()
            cheat._reapplyLevel()
            return count + ' bees placed'
        },
        maxBees() {
            eachBee(h => { h.bond = Math.max(h.bond, 25600000); h.gifted = true })
            P().updateHive()
            cheat._reapplyLevel()
        },
        discoverAll() {
            P().discoveredBees = BEES().slice()
            P().discoveredGifteds = BEES().slice()
        },

        // ---- NEW: more hive slots (the shop caps at 25 extra; this has no cap) ----
        addSlots(n = 20) {
            n = Math.max(0, Math.min(500, n | 0))
            for (let i = 0; i < n; i++) P().addSlot(null)
            P().updateHive()
            cheat._reapplyLevel()
            let total = 0; P().hive.forEach(r => total += r.length)
            return n + ' slots added - hive now has ' + total + ' slots (new rows float above the hive model; 100+ bees can lag)'
        },

        // ---- NEW: bee level beyond 20 ----
        // Locks every bee to this level (re-applied automatically when the hive rebuilds).
        // Not kept through save/reload - run it again after loading.
        setLevel(level = 100) {
            level = Math.max(1, level | 0)
            state.level = level
            cheat._reapplyLevel(true)
            if (!state.levelTimer) state.levelTimer = setInterval(() => { try { cheat._reapplyLevel() } catch (e) {} }, 400)
            return 'all bees locked to level ' + level
        },
        unlockLevel() {
            state.level = null
            if (state.levelTimer) { clearInterval(state.levelTimer); state.levelTimer = null }
            P().updateHive()
            return 'level lock off (bees back to their bond level)'
        },
        _reapplyLevel(force) {
            if (state.level == null) return
            let changed = false
            eachBee((h) => {
                if (!h.bee) return
                if (force || h.bee.level !== state.level || h.level !== state.level) {
                    h.bee.computeLevel(state.level)
                    h.level = state.level
                    changed = true
                }
            })
            if (changed) recomputeStats()
        },

        // ---- NEW: custom damage multiplier (bee attack) ----
        damage(mult = 10) {
            P().precomputedStats.beeAttack = BASE.beeAttack * mult
            P().defaultStats.beeAttack = BASE.beeAttack * mult
            recomputeStats()
            return 'bee attack multiplier set to x' + mult
        },

        // ---- NEW: custom speed / jump (multipliers on the game's base values) ----
        speed(mult = 2) {
            P().precomputedStats.walkSpeed = BASE.walkSpeed * mult
            P().defaultStats.walkSpeed = BASE.walkSpeed * mult
            recomputeStats()
            return 'walk speed x' + mult
        },
        jump(mult = 2) {
            P().precomputedStats.jumpPower = BASE.jumpPower * mult
            P().defaultStats.jumpPower = BASE.jumpPower * mult
            recomputeStats()
            return 'jump power x' + mult
        },
        resetMovement() { cheat.speed(1); cheat.jump(1); return 'speed & jump back to normal' },

        // ---- NEW: mutate every bee ----
        // no args  = best possible roll, rotating through stats
        // stat/num = same mutation on every bee, e.g. mutateAll('attack', 5)  (x5 attack)
        //   stats: attack, gatherAmount, convertAmount, maxEnergy, abilityRate
        mutateAll(stat, num, oper = '*') {
            const best = { attack: 1.75, gatherAmount: 2.1, convertAmount: 2.2, maxEnergy: 2.3, abilityRate: 1.5 }
            const stats = Object.keys(best)
            if (stat && stats.indexOf(stat) < 0) { console.warn('stat must be one of: ' + stats.join(', ')); return }
            let i = 0
            eachBee(h => {
                const s = stat || stats[i++ % stats.length]
                h.mutation = { stat: s, num: stat ? num : best[s], oper: oper }
            })
            P().updateHive()
            cheat._reapplyLevel()
            return 'mutated ' + i + ' bees'
        },

        // ---- NEW: Polar Power (x(1 + 0.05*amount) bee energy) ----
        polarPower(amount = 100) {
            P().addEffect('polarPower', false, false, amount)
            return 'Polar Power x' + amount + ' (= x' + (amount * 0.05 + 1).toFixed(2) + ' bee energy)'
        },

        /* ---- NEW: nectars + status effects ---- */
        // hours is REAL time (the game counts effects down about 1 per real second).
        // If you save and reload while this is active the nectar amount will be inflated -
        // run cheat.clearEffects() after reloading.
        nectars(hours = 24) {
            const names = ['comfortingNectar', 'invigoratingNectar', 'motivatingNectar', 'refreshingNectar', 'satisfyingNectar']
            names.forEach(n => {
                if (!W.effects[n]) return
                W.effects[n].maxCooldown = hours * 3600
                P().addEffect(n, 1)
                const e = P().effects.find(x => x.type === n)
                if (e) e.cooldown = W.effects[n].maxCooldown
            })
            return 'all 5 nectars active for ' + hours + ' hour(s)'
        },

        // ---- effect classification ----
        // Dry-runs every effect on a throw-away copy of your CURRENT stats and sorts it:
        //   good    = raises at least one stat and lowers/breaks none
        //   bad     = lowers a stat, or turns one into NaN/Infinity (this is what wipes damage/pollen)
        //   neutral = changes no stats (ability tokens, field boosts, etc.)  -> never given
        //   error   = update() threw during the dry run                       -> never given
        effectReport() {
            const real = P()
            const out = { good: [], bad: [], neutral: [], error: [], ignored: [] }
            const noop = () => {}
            for (const n in W.effects) {
                const E = W.effects[n]
                if (!E || !E.svg || typeof E.update !== 'function' || E.isPassive || /Passive$/.test(n) || !(E.maxCooldown > 0)) { out.ignored.push(n); continue }
                let inc = false, dec = false, threw = false
                const amts = [1]
                if (isFinite(E.maxAmount) && E.maxAmount > 1) amts.push(Math.min(E.maxAmount, 10))
                for (const amt of amts) {
                    const fake = Object.assign({}, real)
                    for (const k in real.defaultStats) fake[k] = real.defaultStats[k]
                    // nothing inside update() may touch the real game
                    ;['addEffect', 'addMessage', 'updateHive', 'computeStats', 'resetStats', 'updateInventory', 'addSlot', 'damage'].forEach(k => { fake[k] = noop })
                    const before = {}
                    for (const k in fake) if (typeof fake[k] === 'number') before[k] = fake[k]
                    try { E.update(amt, fake) } catch (err) { threw = true; break }
                    for (const k in before) {
                        const v = fake[k]
                        if (typeof v !== 'number' || !isFinite(v)) { if (isFinite(before[k])) dec = true; continue }
                        if (v < before[k] - 1e-9) dec = true
                        else if (v > before[k] + 1e-9) inc = true
                    }
                }
                if (threw) out.error.push(n)
                else if (dec) out.bad.push(n)
                else if (inc) out.good.push(n)
                else out.neutral.push(n)
            }
            return out
        },

        _giveEffect(n, secs) {
            const E = W.effects[n]
            if (E.amountFromCooldown) {
                E.maxCooldown = Math.max(E.maxCooldown, secs)
                P().addEffect(n, 1)
            } else {
                if (isFinite(E.maxCooldown) && E.maxCooldown > 0) E.maxCooldown = Math.max(E.maxCooldown, secs)
                const amt = isFinite(E.maxAmount) ? E.maxAmount : 1
                P().addEffect(n, false, false, amt)
            }
            const e = P().effects.find(x => x.type === n)
            if (e && isFinite(E.maxCooldown)) e.cooldown = E.maxCooldown
        },

        // every GOOD effect, at max stacks, for `hours` (real time). Anything that would lower or break a stat is left out.
        goodEffects(hours = 1) {
            const rep = cheat.effectReport()
            rep.good.forEach(n => cheat._giveEffect(n, hours * 3600))
            try { P().resetStats() } catch (e) {}
            return rep.good.length + ' good effects given for ~' + hours + 'h'
        },
        allEffects(hours = 1) { return cheat.goodEffects(hours) },   // old name, now good-only

        // every BAD effect for `seconds` (default 30s so they wear off by themselves; clearEffects removes them early)
        badEffects(seconds = 30) {
            const rep = cheat.effectReport()
            rep.bad.forEach(n => cheat._giveEffect(n, seconds))
            return rep.bad.length + ' bad effects given for ~' + seconds + 's: ' + rep.bad.join(', ')
        },
        clearEffects() {
            const list = P().effects
            for (let i = list.length - 1; i >= 0; i--) {
                const E = W.effects[list[i].type]
                if (E && E.svg) E.svg.style.display = 'none'
                list.splice(i, 1)
            }
            recomputeStats()
            return 'all effects cleared'
        },

        /* ---- NEW: quests + NPCs ---- */
        // Marks every active quest as complete (turn them in by talking to the NPC)
        finishQuests() {
            let n = 0
            const st = P().stats
            for (const q of P().quests) {
                for (const r of q.req) {
                    const have = (st[r[0]] || 0) - (r[2] || 0)
                    if (have < r[1]) st[r[0]] = (r[2] || 0) + r[1]
                    r[3] = true
                }
                q.completed = true
                if (W.NPCs[q.NPC]) W.NPCs[q.NPC]['activeQuest' + (q.isBeesmasQuest ? '_beesmas' : '')] = false
                n++
            }
            return n + ' active quests completed'
        },

        // Fast-forwards every NPC's dialogue to the end: runs every reward / quest-giving step and
        // completes each quest instantly. Bears whose quests repeat in "portions" (Polar, Brown,
        // Bucko, Riley, Honey, Gummy) get `portions` portions each. Skips the Stick Bug (it starts a
        // challenge), the ant sign and beesmas-only NPCs unless includeAll is true.
        talkToAll(portions = 2, includeAll = false) {
            const skip = includeAll ? [] : ['roboBear', 'stickbug', 'antChallengeSign', 'bubbleHbeeMan', 'beeBear']
            const p = P()
            const saved = {}
            ;['startStickbugChallenge', 'startSnowStorm', 'startHoneyStorm'].forEach(k => { saved[k] = p[k]; p[k] = () => {} })
            const done = [], capped = []
            const regen = (name, n) => {          // same thing the game does when a repeatable bear runs out of lines
                const f = W['dialogue_' + name]
                if (typeof f !== 'function') return false
                n.dialogueIndex = n.dialogueIndex % n.portionLength
                n.dialogue = [...f(p, W.items, W.NPCs)(n.portionsDone)]
                return true
            }
            try {
                for (const name in W.NPCs) {
                    const n = W.NPCs[name]
                    if (skip.indexOf(name) > -1 || !Array.isArray(n.dialogue)) continue
                    n.translatored = true
                    const rounds = n.repeatable ? Math.max(1, portions | 0) : 1
                    let steps = 0
                    for (let r = 0; r < rounds; r++) {
                        if (n.repeatable && n.dialogue[n.dialogueIndex] === undefined) {
                            try { if (!regen(name, n)) break } catch (e) { console.warn('[cheats] could not generate portion for', name, e); break }
                        }
                        while (n.dialogue[n.dialogueIndex] !== undefined && steps++ < 4000) {
                            const entry = n.dialogue[n.dialogueIndex]
                            n.dialogueIndex++
                            if (typeof entry === 'function') {
                                try { entry() } catch (e) { console.warn('[cheats] dialogue step failed for', name, e) }
                                cheat.finishQuests()
                            } else if (Array.isArray(entry) && entry[0] && typeof entry[0][1] === 'function') {
                                try { entry[0][1]() } catch (e) {}
                            }
                        }
                    }
                    if (steps >= 4000) capped.push(name)
                    n.dialogueIndex_savable = n.dialogueIndex
                    n.activeQuest = false
                    done.push(name)
                }
            } finally {
                for (const k in saved) p[k] = saved[k]
            }
            cheat.finishQuests()
            try { p.updateInventory() } catch (e) {}
            try { p.updateHive(); cheat._reapplyLevel() } catch (e) {}
            return 'finished dialogue for: ' + done.join(', ') + (capped.length ? ' (hit step limit: ' + capped.join(', ') + ')' : '')
        },

        /* ---- NEW: custom health ---- */
        // The game hard-codes health at 100 (the regen and bar both clamp to 100), so "health = H" is done by
        // scaling the damage you take by 100/H. 1000 = takes 10x less damage, Infinity = takes none.
        // Falling into the void and "Reset Character" still kill you.
        health(H = 1000) {
            const p = P()
            if (!state.origDamage) state.origDamage = p.damage
            const orig = state.origDamage
            if (!(H > 0)) { console.warn('health must be > 0'); return }
            if (H === 100) { p.damage = orig; p.health = 100; return 'health back to normal (100)' }
            if (H === Infinity) p.damage = () => {}
            else p.damage = am => orig.call(p, am * 100 / H)
            p.health = 100
            return 'health = ' + H + (H === Infinity ? ' (invincible)' : ' (damage taken x' + (100 / H).toFixed(4) + ')')
        },
        heal() { P().health = 100; return 'healed' },

        /* ---- NEW: reset mob timers ---- */
        // Respawns every dead field mob (Rhino Beetles, Ladybugs, Spiders, Werewolf, Mantis, Scorpions, King Beetle,
        // Tunnel Bear) plus the Coconut Crab and Stump Snail. Mobs inside the field you are standing in come back
        // once you step out. Mondo Chick / Vicious Bee / Puffshroom spawn on the real-world clock and can't be reset from here.
        resetMobTimers() {
            const p = P(), mobs = W.objects && W.objects.mobs
            if (!mobs) return needFull('resetMobTimers (objects not exposed)')
            let bugs = 0, special = []
            for (const m of mobs) {
                if (m && 'respawnTimer' in m && m.id && m.type) {                // BugMob family
                    if (m.respawnTimer > 0 || m.state === 'dead') { m.respawnTimer = 0; bugs++ }
                    p.extraInfo[m.id] = 0
                } else if (m && 'isDead' in m && m.isDead > 0) {
                    const nm = m.constructor && m.constructor.name
                    if (nm === 'StumpSnail') {            // revive in place (its own die() would spawn a crab)
                        m.isDead = 0; m.health = 5000000
                        p.extraInfo.mob_snail = 0; p.extraInfo.mob_snail_health = 5000000
                        special.push('Stump Snail')
                    } else {                              // Coconut Crab: let it respawn through its normal path
                        m.isDead = 0.001
                        p.extraInfo.mob_coco = 0
                        special.push('Coconut Crab')
                    }
                }
            }
            // also clear any saved timers for mobs that aren't loaded
            for (const k in p.extraInfo) if (/^mob_/.test(k) && typeof p.extraInfo[k] === 'number' && !/health$/.test(k) && p.extraInfo[k] > 0) p.extraInfo[k] = 0
            return bugs + ' mobs respawned' + (special.length ? ' + ' + special.join(', ') : '') + ' (stand outside the field to see them return)'
        },

        /* ---- gear / shops (patched index only) ---- */
        unlockGear() {
            if (!W.shops) return needFull('unlockGear')
            let n = 0
            for (const s in W.shops) {
                if (W.shops[s].isBeesmasTree) continue
                for (const it of W.shops[s].items) if (it.slot !== 'item' && !it.owned) { it.owned = true; n++ }
            }
            return n + ' gear pieces unlocked (open the shop and click Equip)'
        },
        equip(slot, name) { P().currentGear[slot] = name; return P().currentGear },
        gearList() {
            if (!W.shops) return needFull('gearList')
            const out = {}
            for (const s in W.shops) for (const it of W.shops[s].items) if (it.slot !== 'item') (out[it.slot] = out[it.slot] || []).push(it.name)
            return out
        },

        /* ---- everything at once ---- */
        everything() {
            cheat.honey(1e18)
            cheat.allItems(9999)
            cheat.discoverAll()
            cheat.fillHive('all')
            cheat.unlockGear()
            cheat.fillBag()
            return 'done - open Save Game if you want to keep it'
        },

        /* ---- teleport (patched index only) ---- */
        tpField(name) {
            if (!W.fieldInfo) return needFull('tpField')
            const f = W.fieldInfo[name]
            if (!f) { console.warn('fields:', Object.keys(W.fieldInfo).join(', ')); return }
            const b = P().body && P().body.position
            if (!b) { console.warn('could not find player position'); return }
            b.x = f.x + f.width / 2; b.y = f.y + 3; b.z = f.z + f.length / 2
        },
        fields() { return W.fieldInfo ? Object.keys(W.fieldInfo) : needFull('fields') },

        /* ---- save code helpers ---- */
        saveCode() { return W.getSaveCode ? W.getSaveCode() : '(patched index required)' },
        loadCode(s) { return W.loadSaveCode && W.loadSaveCode(s) },
    }
    /* ------------------------------------------------------------------ */
    /*  access gate: name check (ban) -> password -> short lockout on a   */
    /*  wrong password. Asked once per load; run cheat.logout() to relock */
    /* ------------------------------------------------------------------ */
    const GATE = {
        banned: ['loren'],            // compared case-insensitively, so Loren / LOREN / loren / LoReN all match
        hash: 6281145399787228,       // hash of the password (not stored in plain text)
        lockSeconds: 5,               // lockout after a wrong password
        banKey: 'bss_dev_banned',     // localStorage key that remembers a ban
    }
    const h53 = (str, seed = 0) => {  // cyrb53 string hash
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
        for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677) }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
        return 4294967296 * (2097151 & h2) + (h1 >>> 0)
    }
    const auth = { unlocked: false, banned: false, lockUntil: 0, modal: null }
    try { if (W.localStorage.getItem(GATE.banKey)) auth.banned = true } catch (e) {}

    const toast = (msg, ms = 2600) => {
        const d = W.document
        const old = d.getElementById('cheatToast'); if (old) old.remove()
        const t = d.createElement('div')
        t.id = 'cheatToast'
        t.textContent = msg
        t.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);z-index:100001;background:rgba(20,20,20,.95);color:#fff;font:14px trebuchet ms,sans-serif;padding:10px 16px;border-radius:10px;pointer-events:none'
        d.body.appendChild(t)
        setTimeout(() => { try { t.remove() } catch (e) {} }, ms)
    }
    const setPanel = show => { const p = W.document.getElementById('cheatPanelV4'); if (p) p.style.display = show ? 'block' : 'none' }
    const closeModal = () => { if (auth.modal) { try { auth.modal.ov.remove() } catch (e) {} auth.modal = null } }

    function showModal(title, sub, secret, onSubmit) {
        closeModal()
        const d = W.document
        try { if (d.exitPointerLock) d.exitPointerLock() } catch (e) {}
        const ov = d.createElement('div')
        ov.id = 'cheatGate'
        ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font:14px trebuchet ms,sans-serif'
        const card = d.createElement('div')
        card.style.cssText = 'background:#1c1c1c;color:#fff;padding:18px 20px;border-radius:12px;width:280px;box-shadow:0 6px 30px rgba(0,0,0,.6)'
        const t = d.createElement('div'); t.textContent = title; t.style.cssText = 'font-weight:bold;font-size:16px;margin-bottom:4px'
        const s = d.createElement('div'); s.textContent = sub; s.style.cssText = 'opacity:.65;font-size:12px;margin-bottom:10px'
        const inp = d.createElement('input')
        inp.id = 'cheatGateInput'; inp.type = secret ? 'password' : 'text'; inp.autocomplete = 'off'
        inp.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid #555;background:#111;color:#fff;font-size:14px'
        const hint = d.createElement('div'); hint.textContent = 'Enter to continue, Esc to cancel'; hint.style.cssText = 'opacity:.45;font-size:11px;margin-top:8px'
        card.appendChild(t); card.appendChild(s); card.appendChild(inp); card.appendChild(hint)
        ov.appendChild(card)
        ov.onmousedown = ov.onclick = e => e.stopPropagation()
        d.body.appendChild(ov)
        auth.modal = { ov, inp, onSubmit }
        setTimeout(() => { try { inp.focus() } catch (e) {} }, 0)
    }

    function doBan() {
        auth.banned = true; auth.unlocked = false
        try { W.localStorage.setItem(GATE.banKey, '1') } catch (e) {}
        closeModal(); setPanel(false)
        toast('You have been banned.', 6000)
    }

    function askLogin() {
        showModal('Developer tools', 'Enter your name', false, name => {
            const clean = String(name).trim()
            if (!clean) return
            if (GATE.banned.indexOf(clean.toLowerCase()) > -1) return doBan()
            showModal('Welcome, ' + clean.slice(0, 30), 'Enter the password', true, pw => {
                if (h53(String(pw)) === GATE.hash) {
                    closeModal(); auth.unlocked = true; setPanel(true); toast('Unlocked')
                } else {
                    closeModal()
                    auth.lockUntil = Date.now() + GATE.lockSeconds * 1000
                    toast('Wrong password. Locked for ' + GATE.lockSeconds + ' seconds.')
                }
            })
        })
    }

    function openCheats() {
        if (auth.banned) return toast('You are banned.')
        const wait = Math.ceil((auth.lockUntil - Date.now()) / 1000)
        if (wait > 0) return toast('Locked. Try again in ' + wait + ' second' + (wait === 1 ? '' : 's') + '.')
        if (auth.modal) return
        if (auth.unlocked) { const p = W.document.getElementById('cheatPanelV4'); return setPanel(!p || p.style.display === 'none') }
        askLogin()
    }

    // while the login box is open, keep typing away from the game (WASD, r, i ...) and handle Enter / Esc
    const gateKeys = e => {
        const m = auth.modal
        if (!m || e.target !== m.inp) return
        e.stopPropagation()
        if (e.type !== 'keydown') return
        if (e.key === 'Enter') { e.preventDefault(); m.onSubmit(m.inp.value) }
        else if (e.key === 'Escape') { e.preventDefault(); closeModal() }
    }
    ;['keydown', 'keyup', 'keypress'].forEach(type => {
        if (W.__cheatGateKeys) W.removeEventListener(type, W.__cheatGateKeys, true)
        W.addEventListener(type, gateKeys, true)
    })
    W.__cheatGateKeys = gateKeys

    cheat.login = () => { if (auth.banned) return 'banned'; if (auth.unlocked) return 'already unlocked'; openCheats(); return 'login prompt opened' }
    cheat.logout = () => { auth.unlocked = false; setPanel(false); return 'locked again' }

    // the console API is gated too, otherwise cheat.everything() would skip the login
    const OPEN_FNS = ['help', 'login', 'logout']
    Object.keys(cheat).forEach(k => {
        const f = cheat[k]
        if (typeof f !== 'function' || k[0] === '_' || OPEN_FNS.indexOf(k) > -1) return
        cheat[k] = function () {
            if (auth.banned) { console.warn('[cheats] you are banned.'); return 'banned' }
            if (!auth.unlocked) { console.warn('[cheats] locked - press ` or run cheat.login()'); return 'locked' }
            return f.apply(cheat, arguments)
        }
    })

    window.cheat = cheat
    if (W !== window) W.cheat = cheat

    /* ------------------------------------------------------------------ */
    /*  on-screen panel                                                   */
    /* ------------------------------------------------------------------ */
    const doc = W.document
    ;['cheatPanel', 'cheatPanelV4'].forEach(id => { const old = doc.getElementById(id); if (old) old.remove() })
    const panel = doc.createElement('div')
    panel.id = 'cheatPanelV4'
    panel.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:rgba(20,20,20,.94);color:#fff;font:13px trebuchet ms,sans-serif;padding:10px;border-radius:10px;width:240px;max-height:88vh;overflow-y:auto;display:none;user-select:none'
    panel.innerHTML = '<div style="font-weight:bold;margin-bottom:4px">Dev Tools <span style="float:right;opacity:.6">` to hide</span></div>'
    const log = doc.createElement('div')
    log.style.cssText = 'position:sticky;bottom:-10px;background:rgba(20,20,20,.97);margin-top:6px;padding:4px 0;font-size:11px;opacity:.9;min-height:14px'

    const heading = t => {
        const h = doc.createElement('div')
        h.textContent = t
        h.style.cssText = 'margin:8px 0 2px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.55'
        panel.appendChild(h)
    }
    const ask = (msg, def) => {
        const r = W.prompt(msg, String(def))
        if (r === null) return undefined
        const n = Number(r)
        if (!isFinite(n)) { log.textContent = 'not a number: ' + r; return undefined }
        return n
    }
    const btn = (label, fn) => {
        const b = doc.createElement('button')
        b.textContent = label
        b.style.cssText = 'display:block;width:100%;margin:3px 0;padding:5px;border:0;border-radius:6px;background:#3a7bd5;color:#fff;cursor:pointer'
        b.onclick = e => {
            e.stopPropagation()
            try { const r = fn(); if (r !== undefined) log.textContent = typeof r === 'string' ? r : 'ok' } catch (err) { log.textContent = 'error: ' + err.message; console.error(err) }
        }
        panel.appendChild(b)
    }
    const withNum = (msg, def, fn) => () => { const n = ask(msg, def); if (n !== undefined) return fn(n) }

    heading('Quick')
    btn('Get EVERYTHING', cheat.everything)
    btn('+1 quadrillion honey', () => cheat.honey(1e15))
    btn('Fill bag', cheat.fillBag)

    heading('Items')
    btn('All items + all eggs x9999', () => cheat.allItems(9999))
    btn('Clear item cooldowns', () => { cheat.clearCooldowns(); return 'cooldowns cleared' })

    heading('Bees / hive')
    btn('Fill hive: one of every bee', () => cheat.fillHive('all'))
    btn('Max + gift my bees', () => { cheat.maxBees(); return 'bees maxed' })
    btn('Custom bee level...', withNum('Bee level (above 20 allowed):', 100, cheat.setLevel))
    btn('Add hive slots...', withNum('How many extra slots?', 20, cheat.addSlots))
    btn('Mutate all bees (best rolls)', () => cheat.mutateAll())
    btn('Mutate all: custom...', () => {
        const stat = W.prompt('Stat: attack, gatherAmount, convertAmount, maxEnergy or abilityRate', 'attack')
        if (!stat) return
        const n = ask('Multiplier for ' + stat + ':', 3)
        if (n !== undefined) return cheat.mutateAll(stat.trim(), n)
    })

    heading('Player')
    btn('Damage multiplier...', withNum('Bee attack multiplier (1 = normal):', 10, cheat.damage))
    btn('Walk speed multiplier...', withNum('Speed multiplier (1 = normal):', 2, cheat.speed))
    btn('Jump power multiplier...', withNum('Jump multiplier (1 = normal):', 2, cheat.jump))
    btn('Reset speed & jump', cheat.resetMovement)
    btn('Custom health...', withNum('Health (100 = normal, 1000 = 10x tougher, Infinity = invincible):', 1000, cheat.health))
    btn('Heal to full', cheat.heal)

    heading('Buffs')
    btn('Polar Power amount...', withNum('Polar Power stacks (x1 + 0.05 per stack bee energy):', 500, cheat.polarPower))
    btn('All 5 nectars (hours)...', withNum('Hours of nectar (real time):', 24, cheat.nectars))
    btn('All GOOD effects (hours)...', withNum('Hours for good buffs (only effects that raise stats):', 1, cheat.goodEffects))
    btn('All BAD effects (seconds)...', withNum('Seconds for bad effects (Clear all effects removes them):', 30, cheat.badEffects))
    btn('List good / bad effects (console)', () => { const r = cheat.effectReport(); console.log(r); return 'good ' + r.good.length + ' / bad ' + r.bad.length + ' (see console)' })
    btn('Clear all effects', cheat.clearEffects)


    heading('World')
    btn('Reset mob timers', cheat.resetMobTimers)

    heading('Quests / NPCs')
    btn('Complete all active quests', cheat.finishQuests)
    btn('Talk to ALL bears (skip + rewards)...', withNum('Portions of repeating quests per bear (Polar/Brown/etc.):', 2, n => cheat.talkToAll(n)))

    heading('Gear (patched index only)')
    btn('Unlock all gear', cheat.unlockGear)

    panel.appendChild(log)
    panel.onmousedown = panel.onclick = e => e.stopPropagation()
    doc.body.appendChild(panel)

    const toggleKey = e => { if (e.key === '`') openCheats() }
    if (W.__cheatToggleKey) W.removeEventListener('keydown', W.__cheatToggleKey)
    W.__cheatToggleKey = toggleKey
    W.addEventListener('keydown', toggleKey)

    console.log('[cheats] v4 ' + (FULL ? 'full' : 'LIMITED (original index: no gear/teleport)') + ' mode ready. Press ` to open (login required), or cheat.login() / cheat.help()')
})()
