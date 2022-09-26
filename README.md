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

The config parser supports two _modes_ for parsing. This allows to mark variables generally
as either `required` or `optional`. Additionally a mode `production` is supported. When
using `production` variables are optional _unless NODE_ENV === 'production'_. This is to
help avoid bloated env files during local testing, but still benefiting from the
variable checking.


## Using and Contributing

Please feel free to use the library, and report back bugs, findings and improvements.

The library and the source is licensed under the Apache-2.0 license.
