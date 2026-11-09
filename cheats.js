/* Bee Swarm Simulator (single-player recreation) - dev tools v2
 *
 * Works with the ORIGINAL index (limited: no gear unlock / teleport) or the
 * patched one (full). Load into a save, open the console, paste this file.
 * Toggle the panel with the ` (backtick) key. Everything is also available
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
            console.log('Examples:\n cheat.setLevel(100)\n cheat.addSlots(20)\n cheat.damage(50)\n cheat.speed(3)\n cheat.jump(2)\n cheat.mutateAll()\n cheat.polarPower(500)\n cheat.nectars(24)\n cheat.allEffects(2)\n cheat.finishQuests()\n cheat.talkToAll(2)\n cheat.allItems(9999)')
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

        // every beneficial effect/buff (skips debuffs, challenge effects, passives, and anything that errors)
        allEffects(hours = 1) {
            const skip = /^(corruption|glitch|mindHack|mapCorruption|frozen|beesmasRepentance|scratch|impale|antChallenge|roboChallengeBuff|fetch|targetPractice|smiley|bearMorph.*|tornado|rainCloud|polarPower)$/
            const given = [], failed = []
            for (const n in W.effects) {
                const E = W.effects[n]
                if (skip.test(n) || E.isPassive || /Passive$/.test(n) || !E.svg || !E.update) continue
                try {
                    E.update(1, P())                         // dry run: skip anything that would throw each tick
                    if (E.amountFromCooldown) {
                        E.maxCooldown = Math.max(E.maxCooldown, hours * 3600)
                        P().addEffect(n, 1)
                    } else {
                        if (isFinite(E.maxCooldown) && E.maxCooldown > 0) E.maxCooldown = Math.max(E.maxCooldown, hours * 3600)
                        const amt = isFinite(E.maxAmount) ? E.maxAmount : 1
                        P().addEffect(n, false, false, amt)
                        const e = P().effects.find(x => x.type === n)
                        if (e && isFinite(E.maxCooldown) && E.maxCooldown > 0) e.cooldown = E.maxCooldown
                    }
                    given.push(n)
                } catch (err) { failed.push(n) }
            }
            try { P().resetStats() } catch (e) {}
            return given.length + ' effects given for ~' + hours + 'h' + (failed.length ? ' (' + failed.length + ' skipped: ' + failed.join(', ') + ')' : '')
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
    window.cheat = cheat
    if (W !== window) W.cheat = cheat

    /* ------------------------------------------------------------------ */
    /*  on-screen panel                                                   */
    /* ------------------------------------------------------------------ */
    const doc = W.document
    if (doc.getElementById('cheatPanel')) doc.getElementById('cheatPanel').remove()
    const panel = doc.createElement('div')
    panel.id = 'cheatPanel'
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

    heading('Buffs')
    btn('Polar Power amount...', withNum('Polar Power stacks (x1 + 0.05 per stack bee energy):', 500, cheat.polarPower))
    btn('All 5 nectars (hours)...', withNum('Hours of nectar (real time):', 24, cheat.nectars))
    btn('All status effects (hours)...', withNum('Hours for buffs:', 1, cheat.allEffects))
    btn('Clear all effects', cheat.clearEffects)

    heading('Quests / NPCs')
    btn('Complete all active quests', cheat.finishQuests)
    btn('Talk to ALL bears (skip + rewards)...', withNum('Portions of repeating quests per bear (Polar/Brown/etc.):', 2, n => cheat.talkToAll(n)))

    heading('Gear (patched index only)')
    btn('Unlock all gear', cheat.unlockGear)

    panel.appendChild(log)
    panel.onmousedown = panel.onclick = e => e.stopPropagation()
    doc.body.appendChild(panel)

    if (!W.__cheatKey) {
        W.__cheatKey = true
        W.addEventListener('keydown', e => {
            if (e.key === '`') { const p = doc.getElementById('cheatPanel'); if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none' }
        })
    }

    console.log('[cheats] v2 ' + (FULL ? 'full' : 'LIMITED (original index: no gear/teleport)') + ' mode ready. Press ` for the panel, or cheat.help()')
})()
