import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Table of Contents', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'create-tables-of-contents',
			name: 'Create Tables of Contents',
			callback: createTablesOfContents
		});
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

const DIRECTORY = 'Directory';
const FILE = 'File'; 

const createTablesOfContents = async () => {
	const fs = require("fs/promises");
	const dir = { name: 'root', directories: [], files: [] };
	const basePath = app.vault.adapter.basePath;
	const files = await fs.readdir(basePath);
	for (const file of files) {
		if (file.includes(".obsidian"))
			continue;
		if (file === 'Attachments')
			continue;
		if (file === '1.Table of Contents.md')
			continue;
		const fileType = await checkFile(fs, basePath, file);
		switch (fileType) {
			case DIRECTORY:
				const subDir = await checkDir(fs, basePath, file)
			dir.directories.push(subDir);
			break;
			case FILE:
				dir.files.push(file);
			break;
		};
	};
	await makeTableOfContentsFile(fs, basePath, dir);
};

const checkDir = async (fs, basePath, dirPath) => {
	const name = dirPath.split('/')[dirPath.split('/').length - 1];
	const dir = { name, directories: [], files: [] };
	const files = await fs.readdir(`${basePath}/${dirPath}`);
	for (const file of files) {
		if (file.includes(".obsidian"))
			continue;
		if (file === 'Attachments')
			continue;
		if (file === '1.Table of Contents.md')
			continue;
		const fileType = await checkFile(fs, basePath, `${dirPath}/${file}`);
		switch (fileType) {
			case DIRECTORY:
				const subDir = await checkDir(fs, basePath, `${dirPath}/${file}`);
			dir.directories.push(subDir);
			break;
			case FILE:
				dir.files.push(file);
			break;
		};
	};
	await makeTableOfContentsFile(fs, `${basePath}/${dirPath}`, dir);
	return dir;
};

const checkFile = async (fs, basePath, filePath) => {
	let fileType = '';
	const stats = await fs.stat(`${basePath}/${filePath}`);
	if (stats.isDirectory()) fileType = DIRECTORY;
	if (stats.isFile()) fileType = FILE;
	return fileType;
};

const makeTableOfContentsFile = async (fs, filePath, dir) => {
	let data = '# Folders\n';
	dir.directories.forEach(directory => {
		data += `- [[${directory.name}/1.Table of Contents|${directory.name}]]\n`;
		data += makeSubContents(directory);
	});
	data += '# Files\n';
	dir.files.forEach(file => {
		data += `- [[${file.split('.md')[0]}]]\n`;
	});
	data = data.split('\n');
	data.pop()
	data = data.join('\n');
	await fs.writeFile(`${filePath}/1.Table of Contents.md`, data);
}

const makeSubContents = (dir) => {
	let data = '';
	dir.files.forEach(file => {
		data += `\t-[[${dir.name}/${file.split('.md')[0]}|${file.split('.md')[0]}]]\n`;
	});
	return data;
};
