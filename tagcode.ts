//Tag commands recreated after the Pylon server with addition with closest matches

const tagsKv = new pylon.KVNamespace('tags');

var tagperms = '730088391424606328';
//the role that has access to every tag command, of course multiple are possible

const commands = new discord.command.CommandGroup({
  defaultPrefix: '!'
});
//your prefix

const bestmatches = 3;
//Here you define how many top results it should give you if you do !tag search or if !tag x === undefined

const color = 0x8fff8;
//Here you define your color for your tag Embeds

commands.subcommand('tag', (tagCommands) => {
  tagCommands.on(
    'search',
    (args) => ({
      search: args.stringOptional()
    }),
    async (message, { search }) => {
      if (!search) return message.reply(await gettag('search'));
      //This fixes the issue in the Pylon server that when a tag named 'search' exist,
      //you can't get it because Pylon thinks you want to use the search command and asks you to provide an argument.
      //So making the args optional and running 'search' if no args is provided through my gettag function solves this.
      //you will see this again later in the code, I won't comment it there

      const keylist = await tagsKv.list();
      const result = recursiveLookup(search, keylist);
      if (result.length == 0) {
        var description = 'No close matches';
      } else {
        var description = result
          .slice(0, bestmatches)
          .toString()
          .replace(/,/g, '\n');
      }
      message.reply(
        new discord.Embed({
          title: `📃 Best results`,
          description: description,
          color: color
        })
      );
    }
  );

  tagCommands.on(
    'set',
    (ctx) => ({
      key: ctx.stringOptional(),
      value: ctx.textOptional()
    }),
    async (message, { key, value }) => {
      if (!key && !value) return message.reply(await gettag('search'));
      //Notice how I place this before the filter because the !tag x command has no filter

      if (!message.member.roles.includes(tagperms)) {
        const embed = await restricted(tagperms);
        return message.reply(embed);
      }
      //add this block for every one of the tag commands you want only to be used by the role here declared as tagperms
      //I woud recommend making !tag set restricted since there are only a limited amount of kv keys whuch can be full fast if someone abuses this command

      if (!value) return message.reply('You need to set a value!');
      const oldtag = await tagsKv.get<string>(key!);
      await tagsKv.put(key!, value);
      await message.reply(
        new discord.Embed({
          title: `✅ Tag "${key}" Set`,
          description: `**Old value**
${oldtag ?? '<unset>'}

**New value**
${value}`,
          color: color
        })
      );
    }
  );

  tagCommands.default(
    (ctx) => ({
      key: ctx.string()
    }),
    async (message, { key }) => {
      await message.reply(await gettag(key));
    }
  );

  tagCommands.on(
    'delete',
    (ctx) => ({
      key: ctx.stringOptional()
    }),
    async (message, { key }) => {
      if (!key) return message.reply(await gettag('search'));

      if (!message.member.roles.includes(tagperms)) {
        const embed = await restricted(tagperms);
        return message.reply(embed);
      }
      //add this block for every one of the tag commands you want only to be used by the role here declared as tagperms
      try {
        await tagsKv.delete(key);
      } catch (error) {
        await message.reply({
          content: `Unknown tag: **${key}**`,
          allowedMentions: {}
        });
        return;
      }
      //tries to delete the tag
      await message.reply({
        content: `Tag **${key}** deleted.`,
        allowedMentions: {}
      });
      //allowed mentions {} is important here, since this command could be abused for @everyone pings
    }
  );

  tagCommands.raw('list', async (message) => {
    const keylist = await tagsKv.list();
    const number = await keylist.length.toString();
    const newkeylist = (await keylist.toString()).replace(/,/g, ', ');

    await message.reply(
      new discord.Embed({
        title: `**${number} tags found:** `,
        description: `${newkeylist}`,
        color: color
      })
    );
  });

  tagCommands.raw('normalize', async (message) => {
    if (!message.member.roles.includes(tagperms)) {
      const embed = await restricted(tagperms);
      return message.reply(embed);
    }

    const tagNames = await tagsKv.list();
    let numNormalized = 0;
    for (const key of tagNames) {
      const keyNormalized = key.toLowerCase().trim();
      if (keyNormalized !== key) {
        const value = await tagsKv.get(key);
        await tagsKv.put(keyNormalized, value!);
        await tagsKv.delete(key);
        numNormalized += 1;
      }
    }

    await message.reply(`${numNormalized} tags normalized.`);
  }); //tbh I have no idea what this does, but it is in the Pylon server as well and Jake send me the code so I wanted to include it

  tagCommands.raw({ name: 'commands', aliases: ['help'] }, async (message) => {
    message.reply(
      new discord.Embed({
        title: `Tag commands`,
        description:
          '`' +
          '!tag <value>' +
          '` gives you the info set to that tag\n' +
          '`' +
          '!tag search <value>' +
          '` searches the tag lis and finds the closest 3 matches to your search\n' +
          '`' +
          '!tag list' +
          '` gives you a list of the tags set\n\n' +
          '**Restriced to <@&' +
          tagperms +
          '>**\n' + //those are my permission recommendations, if you change permissions you need to put them somewhere lese here as well
          '`' +
          '!tag set <value>' +
          '` sets a tag\n' +
          '`' +
          '!tag delete <value>' +
          '` deletes specified tag\n' +
          '`' +
          '!tag normalize' +
          '` someone please tell me what this does so I can update this code',
        color: color
      })
    );
  });
});

async function restricted(roleID: string) {
  const embed = new discord.Embed({
    title: `🔒 **You can't use that command!`,
    description: `You must meet following criteria:
has role <@&${roleID}> `,
    color: 0xfc0000
  });
  return embed;
}

function recursiveLookup(
  text: string,
  keys: Array<string>,
  matches: Array<string> = []
): Array<string> {
  if (text.length === 0) return matches;
  keys.forEach((val) => {
    if (val.includes(text) && !matches.includes(val)) matches.push(val);
  });
  return recursiveLookup(text.slice(0, -1), keys, matches);
}

async function gettag(key: string) {
  const value = await tagsKv.get<string>(key);
  if (value === undefined) {
    const keylist = await tagsKv.list();
    const result = recursiveLookup(key, keylist);
    if (result.length == 0) {
      var description = 'No close matches';
    } else {
      var description = result
        .slice(0, bestmatches)
        .toString()
        .replace(/,/g, '\n');
    }

    const embed = new discord.Embed({
      title: `🛑 No results for: ${key}`,
      description:
        `**Did you mean:**
` + description,
      color: color
    });
    return embed; //If the tag isnt found it looks for the 3 closes matches
  } else {
    const embed = new discord.Embed({
      title: `:notebook_with_decorative_cover: **${key}**`,
      description: `**${value}**`,
      color: color
    });
    return embed;
  }
}

//Even though I made for example the set args optional so people can see hat tag named set, this scrip
//still has some tags not accessable because they are commands as well with no args I could make optional
//Those unaccessable tags are: normalize, list, help, commands. If you restrict !tag set then do not set those tags,
//if you want to then you have to change the command name

//Thanks for using my code and thanks to everyone who helped!
//metal#0666
//Jake#0001 for the command lol
//satan#0265

//and me, Kile Alkuri#0606
