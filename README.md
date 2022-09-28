# AitoAI Config parser

## Intent

This library consists of a environment variable parser, which has been used in multiple
different microservices at Aito.ai. The library has been adapted from the original sources.
If something looks strange or out of place, please let us know.

## Benefits

### Fail fast
The config parsing is done
at startup, which allows for a fail-fast sequence at startup. This has proven to
reduce the number of hard to parse runtime errors happening only at the time a variable
is referenced the first time.

### Auto-completion
The other potential benefit of the approach is that the config parser supports
auto-completion for config variables. Unlike simply using 'process.env.VARIABLE' the
user can get some help with discoverability of variables, and bugs due to typo's in
the variable names.

### Type checking

The config parser will allow checking the provided variables. Currently 3 different
basic types are supported: strings, numbers and booleans. This could easily be extended
with a library like [runtypes](https://www.npmjs.com/package/runtypes), which could
allow for more customisable validation. (Todo for the future)

### Parsing modes

The config parser supports two _modes_ for parsing.

1. `development`
1. `production`

In `development`-parsing the variables are fetched from env variables, env-file, and finally
from the defaults-file, in this particular order. Once the variable is found, this value is
validated against the rule-set. The default default file is ' `.env.defaults` and is versioned.

In `production`-parsing the the "production" values will not use the defaults file. Hence, these
variables *must be set in the application config*. The parsing uses firstly the env-variables,
secondly the main config file. The defaults file *is not used*.

These modes allow storing e.g. local passwords in the defaults, but ensuring they are set in
the live config.

Note: The default values are still expected to be a valid value

## Using and Contributing

Please feel free to use the library, and report back bugs, findings and improvements.

The library and the source is licensed under the Apache-2.0 license.
