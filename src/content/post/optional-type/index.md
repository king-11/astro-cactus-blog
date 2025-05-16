---
title: '!A code full of nulls'
tags:
- tech
- programming-language
- functional-programming
description: '"Null pointers a billion dollar mistake" we have heard it so many times
  but we still use them because the alternative style isn''t predominant yet, let''s
  change that because we don''t want a code full of nulls, we want a sky full of stars.'
publishDate: 2025-01-12
coverImage:
  src: cover.webp
  alt: '!A code full of nulls'
---

I recently switched out to a **functional** based approach on how we communicate absence of value to the function caller. Given in ~~C hash~~ **CSharp** it's usually `null` but that needs more care than letting the *compiler* guide us.

In this article I will cover the functional equivalent of communicating *absence of value* functionally using types instead of nulls in languages where its predominant. It will provide you insights into how it's a more safer way to ensure that when your system crashes the next time it's definitely not because of a *null pointer exception*.
## Null History
The creator of `null` himself [Tony Hoare](http://en.wikipedia.org/wiki/Tony_Hoare) (ALGOL) agreed that it was his *billion dollar mistake* in terms of innumerable errors, vulnerabilities, and system crashes, which have probably caused a billion dollars of pain and damage in the last forty years due to *null pointer exceptions* where a developer forgets to access value before checking whether it was `null` or not.

![billion dollars](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbml4MWYycWdycWZhbjl1aGFrZHM3NWJxcWFkeHp3eTl5NG5rZWp4OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jAHwgVRnCv5rVS5QgX/giphy.gif)

### Defensive Approach
Well to be honest we can't just blame it on the caller. The underlying API should communicate that function can return a null by using **documents** or **type system**.

In absence of this information which is usually the case developers have to take a defensive approach of *zero trust policy* where any input and result from calling into API/function can return null.

```csharp
public int myFunction(string input) {
	// check input for null
	if (input == null) // throw error or early return

	var result = someNewFunction();
	if (result == null)
		// throw error or early return
}
```

### Nullable Types
C# doesn't really get much appreciation in terms of how good of a programming language it is in terms of things like:
- Dependency Injection
- Nullable Types
- Pattern Matching
- Object Inheritance
- Async Runtime

I have come to like it a lot, for now focusing on `nullable` types before moving to functional equivalent. [Nullable](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references) types are mid way of pure `null` and functional equivalent, given they provide a type system consistent to functional but the associated APIs with `nullable` types is still filled with foot guns, the compiler will only warn you and not error.
```csharp
public T? validateInput<T>(T input) {
	if (!input.valid()) return null;
	return input
}
```

The above example now communicates to caller that we might return a `null` using `?` operator and then can make use of things like `.?` and `??` which are [null conditional](https://learn.microsoft.com/en-us/archive/msdn-magazine/2014/october/csharp-the-new-and-improved-csharp-6-0) and [null coalescing](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/null-coalescing-operator) operator that make handling of null a little better.
```csharp
validateInput()?.Run();
var result = validateInput(input) ?? defaultInput();
```

>This is definitely better but it still doesn't stop the developer from directly accessing members of a null object without using null safety operators which will again throw errors.

## Functional Equivalent
The functional equivalent of a `null` type is usually something called `None`. The overall type is `Option<T>`/`Optional<T>`/`Maybe<T>` where `T` is generic or type in case value is something and not `None` which is one of the enum variants.

A functional equivalent has the requirement that the type should differentiate between a type that can be a two different versions that is *without* value and *with* value. The `Maybe` type was introduced by forefather of functional languages `Haskell`
```haskell
data Maybe a = Nothing | Just a
```

So `Maybe` has two variants:
- `Nothing` which implies absence of value
- `Just` which holds value `a`

Rust also took this up and its `Enum` supports for allowing things like `Option` and `Result`.
```rust
fn ValidateInput<T>(input: T) -> Option<String> {
	if (!input.isValid()) return None;
	return Some(input)
}
```

Now given these languages require you to handle all the possible [patterns](https://blog.king-11.dev/posts/sum-types/#pattern-matching) properly, so the compiler basically makes it quite impossible for you to escape hatch through this without doing covering all branches.
```rust
let result = ValidateInput(input);
match result {
	Some(value) => //
	None => //
}
```

### Extracting Value
The `Option` provides `unwrap` to extract value if present, otherwise it `panics` so it should be used with care and after checking for prsence of value. It has several other variants as well to provide a default value or lambda to generate default value.
```rust
let result = ValidateInput(input).unwrap_or_else(|| default_value());
```

>The footgun here is user calling unsafe method like `unwrap` on an `optional` without checking, but this is a well know anti pattern and if user is sure it won't be a `None` it's fine to use sometimes.
### Transforming Values
We can chain `Option` values with `filter` and `map` functions to transform if there is some value inside them or return a `None`.
```rust
let result: Option<int32> = Some(5);
let double: Option<int32> = result.map(|v| 2 * v);
```

The `Option` type is a **[Monad](https://en.wikipedia.org/wiki/Monad_(functional_programming)#:~:text=In%20most%20languages%2C%20the%20Maybe,some%20kind%20of%20enumerated%20type.)**, which basically implies that it is a container of value and we can chain it with other functions that accept an `Option` type stuff like `expect`, `unwrap`, `map`, `filter`, etc which are the `functors`.
```rust
fn combine(a: Option<i32>, b: Option<i32>) -> Option<i32> {
	match (a, b) {
		(Some(a_value), Some(b_value)) => Some(a_value + b_value),
		_ => None
	}
}

let result = combine(Some(2), None).map_or(42)
```

We can make use of `?` operator in rust to make things even more succinct rather than checking for each passed input.
```rust
fn combine(a: Option<i32>, b: Option<i32>) -> Option<i32> {
	a? + b?
}
```

### Option Extensions
Languages like `C#`, `Java`, `C++`, etc make use of `null` or `nullptr` very extensively and they over the period have developed ways to align more on the functional approach.

| Language |   Extension   |
| :------: | :-----------: |
|    C#    | Nullable Type |
|   Java   |   Optionals   |
|   C++    |   Optional    |

Both Java and C++ optional were recent additions and provide compiler support for dealing with these types. In case your code makes use of `null`/`nullptr` maybe its time to move away and take up this refactor for safety of your production system.
```cpp
optional<int> o = maybe_return_an_int();
if (o.has_value()) { /* ... */ }
```

>NOTE: `NULL` isn't `null`, for more see [Memory Management](https://blog.king-11.dev/posts/memory-management/#dynamic-sizing)

As I mentioned C# `nullable` types are warnings and not compiler errors so even with them developers can still manage to kill the system. Initially we explored them, but then made a choice to opt for a package, [CSharpFunctionalExtensions](https://github.com/vkhorikov/CSharpFunctionalExtensions) which provides support for `Maybe` type.

## Conclusion
The reason that made Tony opt in for something like `null` is because they are very simple and at this point we all are very much ~~scared~~ familiar with them. Going for something functional comes with cost of knowing a little about the mathematical and **academia** aligned field of functional programming.

There are companies making use of functional languages **Jane Street** uses OCaml, **Bloomberg** uses OCaml, **Fly** uses Elixir, **Databricks** uses Scala, etc so they are very much a viable safe alternative.

![zero trust](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXhsdzF1NDNvcXE5cTlqNXB6OGRuMGplN3A5OWx1MDJlM3Bqdnk2aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRObY948obnZmz6/giphy.gif)
`null` would very much work in an ideal world where API authors add **documentation** in case they are returning nulls and the developers play defensive, ensuring all **validations** are in place before utilising the returned values. But its not an ideal world developers make mistake and have to be guided by the compiler.

Thanks for reading this am diving more into functional programming based on my manager's recommendation and did [Advent of Code](https://adventofcode.com/2024) in [Elixir](https://github.com/king-11/AdventOfCode/?tab=readme-ov-file#advent-of-code) this time.
