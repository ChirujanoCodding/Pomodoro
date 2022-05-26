import {
	SlashCommandBuilder,
	EmbedBuilder,
	APIEmbedField,
} from "discord.js";
import { Command } from "../../structure/Command";
import { v4 as genId } from "uuid";
import { NavEmbedBuilder } from "../../structure/NavEmbedBuilder";
export default class Timers extends Command {
	constructor() {
		super({
			category: "Configuration",
			cooldown: "5s",
			userPerms: ["SendMessages", "UseApplicationCommands"],
			clientPerms: ["SendMessages"],
			data: new SlashCommandBuilder()
				.setName("tasks")
				.setDescription("task options.")

				.addSubcommand((sub) =>
					sub
						.setName("add")
						.setDescription("Add a new task.")
						.addStringOption((opc) =>
							opc
								.setName("name")
								.setRequired(true)
								.setDescription("The name of the task.")
						)
						.addNumberOption((opc) =>
							opc
								.setName("cicles")
								.setRequired(false)
								.setDescription(
									"The number of cicles the task will repeat."
								)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName("remove")
						.setDescription("Remove a task.")
						.addStringOption((opc) =>
							opc
								.setName("id")
								.setRequired(true)
								.setDescription("The id of the task.")
						)
				)
				.addSubcommand((sub) =>
					sub.setName("list").setDescription("List all tasks.")
				)
				.addSubcommand((sub) =>
					sub.setName("start").setDescription("Start your tasks.")
				),

			async run({ client, interaction }) {
				const subcmd = interaction.options.getSubcommand(true);
				const tasksDB = await client.database.import(
					"../models/tasks.ts"
				);

				const functions = {
					add: async () => {
						const task_name = interaction.options.getString("name");
						const cicles =
							interaction.options.getNumber("cicles") || 1;

						if (cicles < 0 || cicles > 10)
							return client.handleError({
								error: "Invalid cicles",
								description:
									"The cicles must be between 0 and 10.",
							});

						const id = genId().substring(0, 8);
						const isAlreadyExists = await tasksDB.findOne({
							server: interaction.guildId,
							user: interaction.user.id,
						});
						if (!isAlreadyExists) {
							const task = new tasksDB({
								server: interaction.guildId,
								user: interaction.user.id,
								task: [
									{
										name: task_name,
										cicles,
										id,
										status: {
											started: false,
											startedAt: Date.now(),
										},
									},
								],
							});
							await task.save();
						} else {
							const task = await tasksDB.findOne({
								server: interaction.guildId,
								user: interaction.user.id,
							});
							task.task.push({
								name: task_name,
								cicles,
								id,		
								status: { started: false },
							});
							await task.save();
						}
						const break_time = cicles * 5;
						const task = await tasksDB.findOne({
							server: interaction.guildId,
							user: interaction.user.id,
						});
						const isStarted = task.task[0].status.startedAt;

						const embed = new EmbedBuilder()
							.setTitle(`📝 | Adding task: \`${task_name}\``)
							.setColor(client.colors.Invisible)
							.setDescription(
								`> \`${cicles}\` cicles of \`25\` minutes each. -> \`${
									cicles * 25
								}\` minutes in total.`
							)
							.addFields([{
								
								name: "`🌐` | ID:",
								value: `> \`${id}\``,
								inline: true,
							}])
							.addFields([{
								name: "`⌛` | Break time:",
								value: `> in \`${
									!isStarted
										? `${break_time / cicles}`
										: `${isStarted - Date.now()}`
								}\` minutes`,
								inline: true,
							}]);

						return interaction.reply({ embeds: [embed] });
					},
					remove: async () => {
						const id = interaction.options.getString("id");
						const task = await tasksDB.findOne({
							id: interaction.user.id,
						});

						if (!task)
							return client.handleError({
								error: "Task not found",
								description:
									"The task you are trying to remove does not exist.",
							});

						const isTask = task.task.find(
							(task: any) => task.id === id
						);
						if (!isTask)
							return client.handleError({
								error: "Task not found",
								description:
									"The task you are trying to remove does not exist.",
							});

						for (let i = 0; i < task.task.length; i++) {
							if (task.task[i].id === id) {
								task.task.splice(i, 1);
								break;
							}
						}

						const int = await interaction.reply({
							embeds: [
								new EmbedBuilder()
									.setTitle("🗑 | Removing task")
									.setColor(client.colors.Invisible),
							],
							fetchReply: true,
						});

						const embed = new EmbedBuilder()
							.setTitle(`🗑 | Removed task: \`${isTask.name}\``)
							.setColor(client.colors.Invisible)
							.setDescription(
								`> \`${
									isTask.cicles
								}\` cicles of \`25\` minutes each. -> \`${
									isTask.cicles * 25
								}\` minutes in total.`
							);

						await task.save();

						return int.edit({ embeds: [embed] });
					},
					list: async () => {
						const task = await tasksDB.findOne({
							id: interaction.user.id,
						});

						const embeds:EmbedBuilder[] = [];

						if (!task)
							return client.handleError({
								error: "Task not found",
								description:
									"You don't add any task to list before.",
							});
	
						const totalCiclesTime = task.task.reduce(
							(acc: any, cur: any) => acc + cur.cicles * 25,
							0
						);
						const allTasks: Array<APIEmbedField> = task.task.map(
							(task: any, i: number) => {
								return {
									name: `${i + 1}. \`📚\` Name: \`${
										task.name
									}\``,
									value: `> \`⌛\` \`${task.cicles}\` cicles of \`25\` minutes each.\n> \`🌐\` | ID: \`${task.id}\``,
									inline: true,
								};
							}
						);

						for (let i = 0; i < allTasks.length; i += 3) {
							embeds.push(new EmbedBuilder().setTitle("📝 | List of tasks").setDescription(`\`${task.task.length}\` tasks found. (\`${totalCiclesTime}\` minutes in total)`
							)
								.setColor(client.colors.Default)
								.addFields([...allTasks.slice(i, i + 3)]));
						}
						if (allTasks.length <= 3) {
							if (allTasks.length === 0) embeds.push
								(new EmbedBuilder().setTitle("📝 | List of tasks").setDescription("No tasks found.").setColor(client.colors.Default));
							return interaction.reply({ embeds: [embeds[0]] });
						} else {
							const nav = new NavEmbedBuilder(embeds)
							nav.start(interaction);
						}
						
					},

					start: async () => {
						const tasks = await tasksDB.findOne({
							server: interaction.guildId,
							user: interaction.user.id,
						});
						if (!tasks)
							return client.handleError({
								error: "no tasks",
								description: "You doesn't have tasks already",
							});
						if (tasks.task.length == 0)
							return client.handleError({
								error: "no tasks",
								description: "You doesn't have tasks already",
							});
						if (tasks.task[0].status.started)
							return client.handleError({
								error: "started",
								description: "You already started the task",
							});
						const totalTime = tasks.task.reduce(
							(acc: any, cur: any) => acc + cur.cicles * 25,
							0
						);
						const embed = new EmbedBuilder()
							.setTitle(
								`\\💻 | Starting task #1 [\`${tasks.task[0].name}\`]`
							)
							.setDescription(
								`\`${
									tasks.task.length - 1
								}\` tasks remaining (${
									totalTime - 25
								}) minutes in total.`
							)
							.setColor(client.colors.Default);

						tasks.task[0].status.started = true;
						tasks.task[0].status.startedAt = Date.now();

						await tasks.save();

						return interaction.reply({ embeds: [embed] });
					},
					stop: () => {},
					current: () => {},
				};

				await functions[subcmd as keyof typeof functions]();
			},
		});
	}
}
