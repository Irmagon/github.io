// ==UserScript==
// @name			HWHExtension
// @name:en			HWHExtension
// @name:ru			HWHExtension
// @namespace		HWHExtension
// @version			1.0
// @description		Extension for HeroWarsHelper script
// @description:en	Extension for HeroWarsHelper script
// @description:ru	Расширение для скрипта HeroWarsHelper
// @author			ZingerY
// @license 		Copyright ZingerY
// @homepage		https://zingery.ru/scripts/HWHExtension.user.js
// @downloadURL		https://irmagon.github.io/HWHExtension.user.js
// @updateURL		https://irmagon.github.io/HWHExtension.user.js
// @icon			https://zingery.ru/scripts/VaultBoyIco16.ico
// @icon64			https://zingery.ru/scripts/VaultBoyIco64.png
// @match			https://www.hero-wars.com/*
// @match			https://apps-1701433570146040.apps.fbsbx.com/*
// @run-at			document-start
// ==/UserScript==

(function () {

if (!this.HWHClasses) {
	console.log('%cObject for extension not found', 'color: red');
	return;
}

console.log('%cStart Extension ' + GM_info.script.name + ', v' + GM_info.script.version + ' by ' + GM_info.script.author, 'color: red');
const { addExtentionName } = HWHFuncs;
addExtentionName(GM_info.script.name, GM_info.script.version, GM_info.script.author);

const {
	getInput,
	setProgress,
	hideProgress,
	I18N,
	send,
	getTimer,
	countdownTimer,
	getUserInfo,
	getSaveVal,
	setSaveVal,
	popup,
	setIsCancalBattle,
	random,
} = HWHFuncs;

function executeDungeon(resolve, reject) {
	let countPredictionCard = 0;
	let dungeonActivity = 0;
	let startDungeonActivity = 0;
	let maxDungeonActivity = 150;
	let limitDungeonActivity = 30180;
	let countShowStats = 1;
	//let fastMode = isChecked('fastMode');
	let end = false;

	let countTeam = [];
	let timeDungeon = {
		all: new Date().getTime(),
		findAttack: 0,
		attackNeutral: 0,
		attackEarthOrFire: 0,
	};

	let titansStates = {};
	let bestBattle = {};

	let teams = {
		neutral: [],
		water: [],
		earth: [],
		fire: [],
		hero: [],
	};

	//тест
	let talentMsg = '';
	let talentMsgReward = '';

	let callsExecuteDungeon = {
		calls: [
			{
				name: 'dungeonGetInfo',
				args: {},
				ident: 'dungeonGetInfo',
			},
			{
				name: 'teamGetAll',
				args: {},
				ident: 'teamGetAll',
			},
			{
				name: 'teamGetFavor',
				args: {},
				ident: 'teamGetFavor',
			},
			{
				name: 'clanGetInfo',
				args: {},
				ident: 'clanGetInfo',
			},
			{
				name: 'inventoryGet',
				args: {},
				ident: 'inventoryGet',
			},
		],
	};

	this.start = async function (titanit) {
		//maxDungeonActivity = titanit > limitDungeonActivity ? limitDungeonActivity : titanit;
		maxDungeonActivity = titanit || getInput('countTitanit');
		send(JSON.stringify(callsExecuteDungeon), startDungeon);
	};

	/** Получаем данные по подземелью */
	function startDungeon(e) {
		stopDung = false; // стоп подземка
		let res = e.results;
		let dungeonGetInfo = res[0].result.response;
		if (!dungeonGetInfo) {
			endDungeon('noDungeon', res);
			return;
		}
		console.log('Начинаем копать на фулл: ', new Date());
		let teamGetAll = res[1].result.response;
		let teamGetFavor = res[2].result.response;
		dungeonActivity = res[3].result.response.stat.todayDungeonActivity;
		startDungeonActivity = res[3].result.response.stat.todayDungeonActivity;
		countPredictionCard = res[4].result.response.consumable[81];
		titansStates = dungeonGetInfo.states.titans;

		teams.hero = {
			favor: teamGetFavor.dungeon_hero,
			heroes: teamGetAll.dungeon_hero.filter((id) => id < 6000),
			teamNum: 0,
		};
		let heroPet = teamGetAll.dungeon_hero.filter((id) => id >= 6000).pop();
		if (heroPet) {
			teams.hero.pet = heroPet;
		}
		teams.neutral = getTitanTeam('neutral');
		teams.water = {
			favor: {},
			heroes: getTitanTeam('water'),
			teamNum: 0,
		};
		teams.earth = {
			favor: {},
			heroes: getTitanTeam('earth'),
			teamNum: 0,
		};
		teams.fire = {
			favor: {},
			heroes: getTitanTeam('fire'),
			teamNum: 0,
		};

		checkFloor(dungeonGetInfo);
	}

	function getTitanTeam(type) {
		switch (type) {
			case 'neutral':
				return [4023, 4022, 4012, 4021, 4011, 4010, 4020];
			case 'water':
				return [4000, 4001, 4002, 4003].filter((e) => !titansStates[e]?.isDead);
			case 'earth':
				return [4020, 4022, 4021, 4023].filter((e) => !titansStates[e]?.isDead);
			case 'fire':
				return [4010, 4011, 4012, 4013].filter((e) => !titansStates[e]?.isDead);
		}
	}

	/** Создать копию объекта */
	function clone(a) {
		return JSON.parse(JSON.stringify(a));
	}

	/** Находит стихию на этаже */
	function findElement(floor, element) {
		for (let i in floor) {
			if (floor[i].attackerType === element) {
				return i;
			}
		}
		return undefined;
	}

	/** Проверяем этаж */
	async function checkFloor(dungeonInfo) {
		if (!('floor' in dungeonInfo) || dungeonInfo.floor?.state == 2) {
			saveProgress();
			return;
		}
		checkTalent(dungeonInfo);
		// console.log(dungeonInfo, dungeonActivity);
		maxDungeonActivity = getInput('countTitanit');
		setProgress(`${I18N('DUNGEON')}: ${I18N('TITANIT')} ${dungeonActivity}/${maxDungeonActivity} ${talentMsg}`);
		//setProgress('Dungeon: Титанит ' + dungeonActivity + '/' + maxDungeonActivity);
		if (dungeonActivity >= maxDungeonActivity) {
			endDungeon('Стоп подземка,', 'набрано титанита: ' + dungeonActivity + '/' + maxDungeonActivity);
			return;
		}
		let activity = dungeonActivity - startDungeonActivity;
		titansStates = dungeonInfo.states.titans;
		if (stopDung) {
			endDungeon('Стоп подземка,', 'набрано титанита: ' + dungeonActivity + '/' + maxDungeonActivity);
			return;
		}
		/*if (activity / 1000 > countShowStats) {
                countShowStats++;
                showStats();
            }*/
		bestBattle = {};
		let floorChoices = dungeonInfo.floor.userData;
		if (floorChoices.length > 1) {
			for (let element in teams) {
				let teamNum = findElement(floorChoices, element);
				if (!!teamNum) {
					if (element == 'earth') {
						teamNum = await chooseEarthOrFire(floorChoices);
						if (teamNum < 0) {
							endDungeon('Невозможно победить без потери Титана!', dungeonInfo);
							return;
						}
					}
					chooseElement(floorChoices[teamNum].attackerType, teamNum);
					return;
				}
			}
		} else {
			chooseElement(floorChoices[0].attackerType, 0);
		}
	}
	//тест черепахи
	async function checkTalent(dungeonInfo) {
		const talent = dungeonInfo.talent;
		if (!talent) {
			return;
		}
		const dungeonFloor = +dungeonInfo.floorNumber;
		const talentFloor = +talent.floorRandValue;
		let doorsAmount = 3 - talent.conditions.doorsAmount;

		if (dungeonFloor === talentFloor && (!doorsAmount || !talent.conditions?.farmedDoors[dungeonFloor])) {
			const reward = await Send({
				calls: [
					{ name: 'heroTalent_getReward', args: { talentType: 'tmntDungeonTalent', reroll: false }, ident: 'group_0_body' },
					{ name: 'heroTalent_farmReward', args: { talentType: 'tmntDungeonTalent' }, ident: 'group_1_body' },
				],
			}).then((e) => e.results[0].result.response);
			const type = Object.keys(reward).pop();
			const itemId = Object.keys(reward[type]).pop();
			const count = reward[type][itemId];
			const itemName = cheats.translate(`LIB_${type.toUpperCase()}_NAME_${itemId}`);
			talentMsgReward += `<br> ${count} ${itemName}`;
			doorsAmount++;
		}
		talentMsg = `<br>TMNT Talent: ${doorsAmount}/3 ${talentMsgReward}<br>`;
	}

	/** Выбираем огнем или землей атаковать */
	async function chooseEarthOrFire(floorChoices) {
		bestBattle.recovery = -11;
		let selectedTeamNum = -1;
		for (let attempt = 0; selectedTeamNum < 0 && attempt < 4; attempt++) {
			for (let teamNum in floorChoices) {
				let attackerType = floorChoices[teamNum].attackerType;
				selectedTeamNum = await attemptAttackEarthOrFire(teamNum, attackerType, attempt);
			}
		}
		console.log('Выбор команды огня или земли: ', selectedTeamNum < 0 ? 'не сделан' : floorChoices[selectedTeamNum].attackerType);
		return selectedTeamNum;
	}

	/** Попытка атаки землей и огнем */
	async function attemptAttackEarthOrFire(teamNum, attackerType, attempt) {
		let start = new Date();
		let team = clone(teams[attackerType]);
		let startIndex = team.heroes.length + attempt - 4;
		if (startIndex >= 0) {
			team.heroes = team.heroes.slice(startIndex);
			let recovery = await getBestRecovery(teamNum, attackerType, team, 25);
			if (recovery > bestBattle.recovery) {
				bestBattle.recovery = recovery;
				bestBattle.selectedTeamNum = teamNum;
				bestBattle.team = team;
			}
		}
		let workTime = new Date().getTime() - start.getTime();
		timeDungeon.attackEarthOrFire += workTime;
		if (bestBattle.recovery < -10) {
			return -1;
		}
		return bestBattle.selectedTeamNum;
	}

	/** Выбираем стихию для атаки */
	async function chooseElement(attackerType, teamNum) {
		let result;
		switch (attackerType) {
			case 'hero':
			case 'water':
				result = await startBattle(teamNum, attackerType, teams[attackerType]);
				break;
			case 'earth':
			case 'fire':
				result = await attackEarthOrFire(teamNum, attackerType);
				break;
			case 'neutral':
				result = await attackNeutral(teamNum, attackerType);
		}
		if (!!result && attackerType != 'hero') {
			let recovery = (!!!bestBattle.recovery ? 10 * getRecovery(result) : bestBattle.recovery) * 100;
			let titans = result.progress[0].attackers.heroes;
			console.log('Проведен бой: ' + attackerType + ', recovery = ' + (recovery > 0 ? '+' : '') + Math.round(recovery) + '% \r\n', titans);
		}
		endBattle(result);
	}

	/** Атакуем Землей или Огнем */
	async function attackEarthOrFire(teamNum, attackerType) {
		if (!!!bestBattle.recovery) {
			bestBattle.recovery = -11;
			let selectedTeamNum = -1;
			for (let attempt = 0; selectedTeamNum < 0 && attempt < 4; attempt++) {
				selectedTeamNum = await attemptAttackEarthOrFire(teamNum, attackerType, attempt);
			}
			if (selectedTeamNum < 0) {
				endDungeon('Невозможно победить без потери Титана!', attackerType);
				return;
			}
		}
		return findAttack(teamNum, attackerType, bestBattle.team);
	}

	/** Находим подходящий результат для атаки */
	async function findAttack(teamNum, attackerType, team) {
		let start = new Date();
		let recovery = -1000;
		let iterations = 0;
		let result;
		let correction = 0.01;
		for (let needRecovery = bestBattle.recovery; recovery < needRecovery; needRecovery -= correction, iterations++) {
			result = await startBattle(teamNum, attackerType, team);
			recovery = getRecovery(result);
		}
		bestBattle.recovery = recovery;
		let workTime = new Date().getTime() - start.getTime();
		timeDungeon.findAttack += workTime;
		return result;
	}

	/** Атакуем Нейтральной командой */
	async function attackNeutral(teamNum, attackerType) {
		let start = new Date();
		let factors = calcFactor();
		bestBattle.recovery = -0.2;
		await findBestBattleNeutral(teamNum, attackerType, factors, true);
		if (bestBattle.recovery < 0 || (bestBattle.recovery < 0.2 && factors[0].value < 0.5)) {
			let recovery = 100 * bestBattle.recovery;
			console.log(
				'Не удалось найти удачный бой в быстром режиме: ' +
					attackerType +
					', recovery = ' +
					(recovery > 0 ? '+' : '') +
					Math.round(recovery) +
					'% \r\n',
				bestBattle.attackers
			);
			await findBestBattleNeutral(teamNum, attackerType, factors, false);
		}
		let workTime = new Date().getTime() - start.getTime();
		timeDungeon.attackNeutral += workTime;
		if (!!bestBattle.attackers) {
			let team = getTeam(bestBattle.attackers);
			return findAttack(teamNum, attackerType, team);
		}
		endDungeon('Не удалось найти удачный бой!', attackerType);
		return undefined;
	}

	/** Находит лучшую нейтральную команду */
	async function findBestBattleNeutral(teamNum, attackerType, factors, mode) {
		let countFactors = factors.length < 4 ? factors.length : 4;
		let aradgi = !titansStates['4013']?.isDead;
		let edem = !titansStates['4023']?.isDead;
		let dark = [4032, 4033].filter((e) => !titansStates[e]?.isDead);
		let light = [4042].filter((e) => !titansStates[e]?.isDead);
		let actions = [];
		if (mode) {
			for (let i = 0; i < countFactors; i++) {
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(factors[i].id)));
			}
			if (countFactors > 1) {
				let firstId = factors[0].id;
				let secondId = factors[1].id;
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4001, secondId)));
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4002, secondId)));
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4003, secondId)));
			}
			if (aradgi) {
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4013)));
				if (countFactors > 0) {
					let firstId = factors[0].id;
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4000, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4001, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4002, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4003, 4013)));
				}
				if (edem) {
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4023, 4000, 4013)));
				}
			}
		} else {
			if (mode) {
				for (let i = 0; i < factors.length; i++) {
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(factors[i].id)));
				}
			} else {
				countFactors = factors.length < 2 ? factors.length : 2;
			}
			for (let i = 0; i < countFactors; i++) {
				let mainId = factors[i].id;
				if (aradgi && (mode || i > 0)) {
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4000, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, 4013)));
				}
				for (let i = 0; i < dark.length; i++) {
					let darkId = dark[i];
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, darkId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, darkId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, darkId)));
				}
				for (let i = 0; i < light.length; i++) {
					let lightId = light[i];
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, lightId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, lightId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, lightId)));
				}
				let isFull = mode || i > 0;
				for (let j = isFull ? i + 1 : 2; j < factors.length; j++) {
					let extraId = factors[j].id;
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4000, extraId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, extraId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, extraId)));
				}
			}
			if (aradgi) {
				if (mode) {
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4013)));
				}
				for (let i = 0; i < dark.length; i++) {
					let darkId = dark[i];
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(darkId, 4001, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(darkId, 4002, 4013)));
				}
				for (let i = 0; i < light.length; i++) {
					let lightId = light[i];
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(lightId, 4001, 4013)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(lightId, 4002, 4013)));
				}
			}
			for (let i = 0; i < dark.length; i++) {
				let firstId = dark[i];
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId)));
				for (let j = i + 1; j < dark.length; j++) {
					let secondId = dark[j];
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4001, secondId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4002, secondId)));
				}
			}
			for (let i = 0; i < light.length; i++) {
				let firstId = light[i];
				actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId)));
				for (let j = i + 1; j < light.length; j++) {
					let secondId = light[j];
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4001, secondId)));
					actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4002, secondId)));
				}
			}
		}
		for (let result of await Promise.all(actions)) {
			let recovery = getRecovery(result);
			if (recovery > bestBattle.recovery) {
				bestBattle.recovery = recovery;
				bestBattle.attackers = result.progress[0].attackers.heroes;
			}
		}
	}

	/** Получаем нейтральную команду */
	function getNeutralTeam(id, swapId, addId) {
		let neutralTeam = clone(teams.water);
		let neutral = neutralTeam.heroes;
		if (neutral.length == 4) {
			if (!!swapId) {
				for (let i in neutral) {
					if (neutral[i] == swapId) {
						neutral[i] = addId;
					}
				}
			}
		} else if (!!addId) {
			neutral.push(addId);
		}
		neutral.push(id);
		return neutralTeam;
	}

	/** Получить команду титанов */
	function getTeam(titans) {
		return {
			favor: {},
			heroes: Object.keys(titans).map((id) => parseInt(id)),
			teamNum: 0,
		};
	}

	/** Вычисляем фактор боеготовности титанов */
	function calcFactor() {
		let neutral = teams.neutral;
		let factors = [];
		for (let i in neutral) {
			let titanId = neutral[i];
			let titan = titansStates[titanId];
			let factor = !!titan ? titan.hp / titan.maxHp + titan.energy / 10000.0 : 1;
			if (factor > 0) {
				factors.push({ id: titanId, value: factor });
			}
		}
		factors.sort(function (a, b) {
			return a.value - b.value;
		});
		return factors;
	}

	/** Возвращает наилучший результат из нескольких боев */
	async function getBestRecovery(teamNum, attackerType, team, countBattle) {
		let bestRecovery = -1000;
		let actions = [];
		for (let i = 0; i < countBattle; i++) {
			actions.push(startBattle(teamNum, attackerType, team));
		}
		for (let result of await Promise.all(actions)) {
			let recovery = getRecovery(result);
			if (recovery > bestRecovery) {
				bestRecovery = recovery;
			}
		}
		return bestRecovery;
	}

	/** Возвращает разницу в здоровье атакующей команды после и до битвы и проверяет здоровье титанов на необходимый минимум*/
	function getRecovery(result) {
		if (result.result.stars < 3) {
			return -100;
		}
		let beforeSumFactor = 0;
		let afterSumFactor = 0;
		let beforeTitans = result.battleData.attackers;
		let afterTitans = result.progress[0].attackers.heroes;
		for (let i in afterTitans) {
			let titan = afterTitans[i];
			let percentHP = titan.hp / beforeTitans[i].hp;
			let energy = titan.energy;
			let factor = checkTitan(i, energy, percentHP) ? getFactor(i, energy, percentHP) : -100;
			afterSumFactor += factor;
		}
		for (let i in beforeTitans) {
			let titan = beforeTitans[i];
			let state = titan.state;
			beforeSumFactor += !!state ? getFactor(i, state.energy, state.hp / titan.hp) : 1;
		}
		return afterSumFactor - beforeSumFactor;
	}

	/** Возвращает состояние титана*/
	function getFactor(id, energy, percentHP) {
		let elemantId = id.slice(2, 3);
		let isEarthOrFire = elemantId == '1' || elemantId == '2';
		let energyBonus = id == '4020' && energy == 1000 ? 0.1 : energy / 20000.0;
		let factor = percentHP + energyBonus;
		return isEarthOrFire ? factor : factor / 10;
	}

	/** Проверяет состояние титана*/
	function checkTitan(id, energy, percentHP) {
		switch (id) {
			case '4020':
				return percentHP > 0.25 || (energy == 1000 && percentHP > 0.05);
				break;
			case '4010':
				return percentHP + energy / 2000.0 > 0.63;
				break;
			case '4000':
				return percentHP > 0.62 || (energy < 1000 && ((percentHP > 0.45 && energy >= 400) || (percentHP > 0.3 && energy >= 670)));
		}
		return true;
	}

	/** Начинаем бой */
	function startBattle(teamNum, attackerType, args) {
		return new Promise(function (resolve, reject) {
			args.teamNum = teamNum;
			let startBattleCall = {
				calls: [
					{
						name: 'dungeonStartBattle',
						args,
						ident: 'body',
					},
				],
			};
			send(JSON.stringify(startBattleCall), resultBattle, {
				resolve,
				teamNum,
				attackerType,
			});
		});
	}

	/** Возращает результат боя в промис */
	/*function resultBattle(resultBattles, args) {
            if (!!resultBattles && !!resultBattles.results) {
                let battleData = resultBattles.results[0].result.response;
                let battleType = "get_tower";
                if (battleData.type == "dungeon_titan") {
                    battleType = "get_titan";
                }
				battleData.progress = [{ attackers: { input: ["auto", 0, 0, "auto", 0, 0] } }];//тест подземка правки
                BattleCalc(battleData, battleType, function (result) {
                    result.teamNum = args.teamNum;
                    result.attackerType = args.attackerType;
                    args.resolve(result);
                });
            } else {
                endDungeon('Потеряна связь с сервером игры!', 'break');
            }
        }*/
	function resultBattle(resultBattles, args) {
		battleData = resultBattles.results[0].result.response;
		battleType = 'get_tower';
		if (battleData.type == 'dungeon_titan') {
			battleType = 'get_titan';
		}
		battleData.progress = [{ attackers: { input: ['auto', 0, 0, 'auto', 0, 0] } }];
		BattleCalc(battleData, battleType, function (result) {
			result.teamNum = args.teamNum;
			result.attackerType = args.attackerType;
			args.resolve(result);
		});
	}

	/** Заканчиваем бой */

	////
	async function endBattle(battleInfo) {
		if (!!battleInfo) {
			const args = {
				result: battleInfo.result,
				progress: battleInfo.progress,
			};
			if (battleInfo.result.stars < 3) {
				endDungeon('Герой или Титан мог погибнуть в бою!', battleInfo);
				return;
			}
			if (countPredictionCard > 0) {
				args.isRaid = true;
				countPredictionCard--;
			} else {
				const timer = getTimer(battleInfo.battleTime);
				console.log(timer);
				await countdownTimer(timer, `${I18N('DUNGEON')}: ${I18N('TITANIT')} ${dungeonActivity}/${maxDungeonActivity} ${talentMsg}`);
			}
			const calls = [
				{
					name: 'dungeonEndBattle',
					args,
					ident: 'body',
				},
			];
			lastDungeonBattleData = null;
			send(JSON.stringify({ calls }), resultEndBattle);
		} else {
			endDungeon('dungeonEndBattle win: false\n', battleInfo);
		}
	}
	/** Получаем и обрабатываем результаты боя */
	function resultEndBattle(e) {
		if (!!e && !!e.results) {
			let battleResult = e.results[0].result.response;
			if ('error' in battleResult) {
				endDungeon('errorBattleResult', battleResult);
				return;
			}
			let dungeonGetInfo = battleResult.dungeon ?? battleResult;
			dungeonActivity += battleResult.reward.dungeonActivity ?? 0;
			checkFloor(dungeonGetInfo);
		} else {
			endDungeon('Потеряна связь с сервером игры!', 'break');
		}
	}

	/** Добавить команду титанов в общий список команд */
	function addTeam(team) {
		for (let i in countTeam) {
			if (equalsTeam(countTeam[i].team, team)) {
				countTeam[i].count++;
				return;
			}
		}
		countTeam.push({ team: team, count: 1 });
	}

	/** Сравнить команды на равенство */
	function equalsTeam(team1, team2) {
		if (team1.length == team2.length) {
			for (let i in team1) {
				if (team1[i] != team2[i]) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	function saveProgress() {
		let saveProgressCall = {
			calls: [
				{
					name: 'dungeonSaveProgress',
					args: {},
					ident: 'body',
				},
			],
		};
		send(JSON.stringify(saveProgressCall), resultEndBattle);
	}

	/** Выводит статистику прохождения подземелья */
	function showStats() {
		let activity = dungeonActivity - startDungeonActivity;
		let workTime = clone(timeDungeon);
		workTime.all = new Date().getTime() - workTime.all;
		for (let i in workTime) {
			workTime[i] = Math.round(workTime[i] / 1000);
		}
		countTeam.sort(function (a, b) {
			return b.count - a.count;
		});
		console.log(titansStates);
		console.log('Собрано титанита: ', activity);
		console.log('Скорость сбора: ' + Math.round((3600 * activity) / workTime.all) + ' титанита/час');
		console.log('Время раскопок: ');
		for (let i in workTime) {
			let timeNow = workTime[i];
			console.log(
				i + ': ',
				Math.round(timeNow / 3600) + ' ч. ' + Math.round((timeNow % 3600) / 60) + ' мин. ' + (timeNow % 60) + ' сек.'
			);
		}
		console.log('Частота использования команд: ');
		for (let i in countTeam) {
			let teams = countTeam[i];
			console.log(teams.team + ': ', teams.count);
		}
	}

	/** Заканчиваем копать подземелье */
	function endDungeon(reason, info) {
		if (!end) {
			end = true;
			console.log(reason, info);
			showStats();
			if (info == 'break') {
				setProgress(
					'Dungeon stoped: Титанит ' + dungeonActivity + '/' + maxDungeonActivity + '\r\nПотеряна связь с сервером игры!',
					false,
					hideProgress
				);
			} else {
				setProgress('Dungeon completed: Титанит ' + dungeonActivity + '/' + maxDungeonActivity, false, hideProgress);
			}
			setTimeout(cheats.refreshGame, 1000);
			resolve();
		}
	}
}

this.HWHClasses.executeDungeon = executeDungeon;

class executeAdventure {
	type = 'default';

	actions = {
		default: {
			getInfo: 'adventure_getInfo',
			startBattle: 'adventure_turnStartBattle',
			endBattle: 'adventure_endBattle',
			collectBuff: 'adventure_turnCollectBuff',
		},
		solo: {
			getInfo: 'adventureSolo_getInfo',
			startBattle: 'adventureSolo_turnStartBattle',
			endBattle: 'adventureSolo_endBattle',
			collectBuff: 'adventureSolo_turnCollectBuff',
		},
	};

	terminatеReason = I18N('UNKNOWN');
	callAdventureInfo = {
		name: 'adventure_getInfo',
		args: {},
		ident: 'adventure_getInfo',
	};
	callTeamGetAll = {
		name: 'teamGetAll',
		args: {},
		ident: 'teamGetAll',
	};
	callTeamGetFavor = {
		name: 'teamGetFavor',
		args: {},
		ident: 'teamGetFavor',
	};
	callStartBattle = {
		name: 'adventure_turnStartBattle',
		args: {},
		ident: 'body',
	};
	callEndBattle = {
		name: 'adventure_endBattle',
		args: {
			result: {},
			progress: {},
		},
		ident: 'body',
	};
	callCollectBuff = {
		name: 'adventure_turnCollectBuff',
		args: {},
		ident: 'body',
	};

	constructor(resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}

	async start(type) {
		this.type = type || this.type;
		this.callAdventureInfo.name = this.actions[this.type].getInfo;
		const data = await Send(
			JSON.stringify({
				calls: [this.callAdventureInfo, this.callTeamGetAll, this.callTeamGetFavor],
			})
		);
		return this.checkAdventureInfo(data.results);
	}

	async getPath() {
		const oldVal = getSaveVal('adventurePath', '');
		const keyPath = `adventurePath:${this.mapIdent}`;
		const answer = await popup.confirm(I18N('ENTER_THE_PATH'), [
			{
				msg: I18N('START_ADVENTURE'),
				placeholder: '1,2,3,4,5,6',
				isInput: true,
				default: getSaveVal(keyPath, oldVal),
			},
			{
				msg: I18N('BTN_CANCEL'),
				result: false,
				isCancel: true,
			},
		]);
		if (!answer) {
			this.terminatеReason = I18N('BTN_CANCELED');
			return false;
		}

		let path = answer.split(',');
		if (path.length < 2) {
			path = answer.split('-');
		}
		if (path.length < 2) {
			this.terminatеReason = I18N('MUST_TWO_POINTS');
			return false;
		}

		for (let p in path) {
			path[p] = +path[p].trim();
			if (Number.isNaN(path[p])) {
				this.terminatеReason = I18N('MUST_ONLY_NUMBERS');
				return false;
			}
		}

		if (!this.checkPath(path)) {
			return false;
		}
		setSaveVal(keyPath, answer);
		return path;
	}

	checkPath(path) {
		for (let i = 0; i < path.length - 1; i++) {
			const currentPoint = path[i];
			const nextPoint = path[i + 1];

			const isValidPath = this.paths.some(
				(p) => (p.from_id === currentPoint && p.to_id === nextPoint) || (p.from_id === nextPoint && p.to_id === currentPoint)
			);

			if (!isValidPath) {
				this.terminatеReason = I18N('INCORRECT_WAY', {
					from: currentPoint,
					to: nextPoint,
				});
				return false;
			}
		}

		return true;
	}

	async checkAdventureInfo(data) {
		this.advInfo = data[0].result.response;
		if (!this.advInfo) {
			this.terminatеReason = I18N('NOT_ON_AN_ADVENTURE');
			return this.end();
		}
		const heroesTeam = data[1].result.response.adventure_hero;
		const favor = data[2]?.result.response.adventure_hero;
		const heroes = heroesTeam.slice(0, 5);
		const pet = heroesTeam[5];
		this.args = {
			pet,
			heroes,
			favor,
			path: [],
			broadcast: false,
		};
		const userInfo = getUserInfo();
		const advUserInfo = this.advInfo.users[userInfo.id];
		this.turnsLeft = advUserInfo.turnsLeft;
		this.currentNode = advUserInfo.currentNode;
		this.nodes = this.advInfo.nodes;
		this.paths = this.advInfo.paths;
		this.mapIdent = this.advInfo.mapIdent;

		this.path = await this.getPath();
		if (!this.path) {
			return this.end();
		}

		if (this.currentNode == 1 && this.path[0] != 1) {
			this.path.unshift(1);
		}

		return this.loop();
	}

	async loop() {
		const position = this.path.indexOf(+this.currentNode);
		if (!~position) {
			this.terminatеReason = I18N('YOU_IN_NOT_ON_THE_WAY');
			return this.end();
		}
		this.path = this.path.slice(position);
		if (
			this.path.length - 1 > this.turnsLeft &&
			(await popup.confirm(I18N('ATTEMPTS_NOT_ENOUGH'), [
				{ msg: I18N('YES_CONTINUE'), result: false },
				{ msg: I18N('BTN_NO'), result: true },
			]))
		) {
			this.terminatеReason = I18N('NOT_ENOUGH_AP');
			return this.end();
		}
		const toPath = [];
		for (const nodeId of this.path) {
			if (!this.turnsLeft) {
				this.terminatеReason = I18N('ATTEMPTS_ARE_OVER');
				return this.end();
			}
			toPath.push(nodeId);
			console.log(toPath);
			if (toPath.length > 1) {
				setProgress(toPath.join(' > ') + ` ${I18N('MOVES')}: ` + this.turnsLeft);
			}
			if (nodeId == this.currentNode) {
				continue;
			}

			const nodeInfo = this.getNodeInfo(nodeId);
			if (nodeInfo.type == 'TYPE_COMBAT') {
				if (nodeInfo.state == 'empty') {
					this.turnsLeft--;
					continue;
				}

				/**
				 * Disable regular battle cancellation
				 *
				 * Отключаем штатную отменую боя
				 */
				setIsCancalBattle(false);
				if (await this.battle(toPath)) {
					this.turnsLeft--;
					toPath.splice(0, toPath.indexOf(nodeId));
					nodeInfo.state = 'empty';
					setIsCancalBattle(true);
					continue;
				}
				setIsCancalBattle(true);
				return this.end();
			}

			if (nodeInfo.type == 'TYPE_PLAYERBUFF') {
				const buff = this.checkBuff(nodeInfo);
				if (buff == null) {
					continue;
				}

				if (await this.collectBuff(buff, toPath)) {
					this.turnsLeft--;
					toPath.splice(0, toPath.indexOf(nodeId));
					continue;
				}
				this.terminatеReason = I18N('BUFF_GET_ERROR');
				return this.end();
			}
		}
		this.terminatеReason = I18N('SUCCESS');
		return this.end();
	}

	/**
	 * Carrying out a fight
	 *
	 * Проведение боя
	 */
	async battle(path, preCalc = true) {
		const data = await this.startBattle(path);
		try {
			const battle = data.results[0].result.response.battle;
			let result = await Calc(battle);

			if (!result.result.win) {
				const { WinFixBattle } = HWHClasses;
				const cloneBattle = structuredClone(battle);
				const bFix = new WinFixBattle(cloneBattle);
				const endTime = Date.now() + 1e4; // 10 sec
				const fixResult = await bFix.start(endTime, Infinity);
				console.log(fixResult);
				if (fixResult.value) {
					result = fixResult;
				}
			}

			if (result.result.win) {
				const info = await this.endBattle(result);
				if (info.results[0].result.response?.error) {
					this.terminatеReason = I18N('BATTLE_END_ERROR');
					return false;
				}
			} else {
				await this.cancelBattle(result);

				if (preCalc && (await this.preCalcBattle(battle))) {
					path = path.slice(-2);
					for (let i = 1; i <= getInput('countAutoBattle'); i++) {
						setProgress(`${I18N('AUTOBOT')}: ${i}/${getInput('countAutoBattle')}`);
						const result = await this.battle(path, false);
						if (result) {
							setProgress(I18N('VICTORY'));
							return true;
						}
					}
					this.terminatеReason = I18N('FAILED_TO_WIN_AUTO');
					return false;
				}
				return false;
			}
		} catch (error) {
			console.error(error);
			if (
				await popup.confirm(I18N('ERROR_OF_THE_BATTLE_COPY'), [
					{ msg: I18N('BTN_NO'), result: false },
					{ msg: I18N('BTN_YES'), result: true },
				])
			) {
				this.errorHandling(error, data);
			}
			this.terminatеReason = I18N('ERROR_DURING_THE_BATTLE');
			return false;
		}
		return true;
	}

	/**
	 * Recalculate battles
	 *
	 * Прерасчтет битвы
	 */
	async preCalcBattle(battle) {
		const countTestBattle = getInput('countTestBattle');
		for (let i = 0; i < countTestBattle; i++) {
			battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
			const result = await Calc(battle);
			if (result.result.win) {
				console.log(i, countTestBattle);
				return true;
			}
		}
		this.terminatеReason = I18N('NO_CHANCE_WIN') + countTestBattle;
		return false;
	}

	/**
	 * Starts a fight
	 *
	 * Начинает бой
	 */
	startBattle(path) {
		this.args.path = path;
		this.callStartBattle.name = this.actions[this.type].startBattle;
		this.callStartBattle.args = this.args;
		const calls = [this.callStartBattle];
		return Send(JSON.stringify({ calls }));
	}

	cancelBattle(battle) {
		const fixBattle = function (heroes) {
			for (const ids in heroes) {
				const hero = heroes[ids];
				hero.energy = random(1, 999);
				if (hero.hp > 0) {
					hero.hp = random(1, hero.hp);
				}
			}
		};
		fixBattle(battle.progress[0].attackers.heroes);
		fixBattle(battle.progress[0].defenders.heroes);
		return this.endBattle(battle);
	}

	/**
	 * Ends the fight
	 *
	 * Заканчивает бой
	 */
	endBattle(battle) {
		this.callEndBattle.name = this.actions[this.type].endBattle;
		this.callEndBattle.args.result = battle.result;
		this.callEndBattle.args.progress = battle.progress;
		const calls = [this.callEndBattle];
		return Send(JSON.stringify({ calls }));
	}

	/**
	 * Checks if you can get a buff
	 *
	 * Проверяет можно ли получить баф
	 */
	checkBuff(nodeInfo) {
		let id = null;
		let value = 0;
		for (const buffId in nodeInfo.buffs) {
			const buff = nodeInfo.buffs[buffId];
			if (buff.owner == null && buff.value > value) {
				id = buffId;
				value = buff.value;
			}
		}
		nodeInfo.buffs[id].owner = 'Я';
		return id;
	}

	/**
	 * Collects a buff
	 *
	 * Собирает баф
	 */
	async collectBuff(buff, path) {
		this.callCollectBuff.name = this.actions[this.type].collectBuff;
		this.callCollectBuff.args = { buff, path };
		const calls = [this.callCollectBuff];
		return Send(JSON.stringify({ calls }));
	}

	getNodeInfo(nodeId) {
		return this.nodes.find((node) => node.id == nodeId);
	}

	errorHandling(error, data) {
		//console.error(error);
		let errorInfo = error.toString() + '\n';
		try {
			const errorStack = error.stack.split('\n');
			const endStack = errorStack.map((e) => e.split('@')[0]).indexOf('testAdventure');
			errorInfo += errorStack.slice(0, endStack).join('\n');
		} catch (e) {
			errorInfo += error.stack;
		}
		if (data) {
			errorInfo += '\nData: ' + JSON.stringify(data);
		}
		copyText(errorInfo);
	}

	end() {
		setIsCancalBattle(true);
		setProgress(this.terminatеReason, true);
		console.log(this.terminatеReason);
		this.resolve();
	}
}

this.HWHClasses.executeAdventure = executeAdventure;

})();
