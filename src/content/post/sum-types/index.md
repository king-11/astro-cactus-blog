---
title: Union/Sum Type
description: Union/Sum Types are very useful when we want to represent different classes
  that represent variation of a single type like different kinds of operating systems,
  mobile phones, etc.
tags:
- programming-language
- tech
publishDate: 2024-01-20
coverImage:
  src: cover.webp
  alt: Union/Sum Type
---

Let's take an example of operating system information as a data structure to better understand sum types.

## Struct
Our bare minimum struct to represent an operating system contains a few common fields that would exist in each of the operating system.
```c
typedef struct {
  char organization[];
  int releaseYear;
  float version;
  int is_opensource;
} os;
```

It's missing one thing though the **type of operating system** like `macOS`, `linux`, `windows`, etc.

## Enum
We will add in a new field into our structure to represent the type of operating system by using an `enum`.
```c
typedef enum
{
  Linux,
  Windows,
  MacOS
} os_type_enum;

typedef struct {
  ...
  os_type_enum os_type;
} os;
```

## More Data Fields
Consider the case of Linux, there are many distributions like `Manjaro`, `Fedora`, `Ubuntu`, `Zorin`, etc. we want to store this data as well.

So what can we do now with our struct and enum combination is we can create a new field which will be `nullptr` in case of `MacOS` and `Windows` and in case of `Linux` it will hold data.
```c
typedef struct {
  ...
  char distribution[];
} os;
```

Now it comes down to **user** to manage this **logic** properly the language won't provide support for anything. But there is a better way to handle such things we can use `union`.

## Union
**C language**, yes the elder one has features for us to easily create sum type by using `union` keyword. And you thought your new and shiny language has an advantage over it _"much to learn you still have"_
![yoda telling you to appreciate C language](https://media.giphy.com/media/87I8pKmdcAKw8/giphy.gif)

We will create three new structs each representing meta details about each operating system. In case of `macOS` and `Windows` these would be empty structs but in case of `linux`  will have a data field.
```c
typedef struct {
  char distribution[];
} linux_details;

typedef struct {} mac_os_details;
typedef struct {} windows_details;

union os_details_union {
  linux_details linux;
  mac_os_details mac_os;
  windows_details windows;
};

typedef struct {
  ...
  os_details_union os_details;
} os;
```

**Union** forms the basis for sum types which is actually a **mathematical concept** represented by `A U B` where A and B are individual types.

The opposite of sum type is **product type**, which is represented in programming languages by a normal `class` or `struct`. An `interface` represents an **intersection** in mathematical terms.

### Memory Requirements
A union variable will always be the size of its largest element. So even if I have some fields in the other two structures as well it still won't be an addition of individual struct size but instead a max.
```c
int struct_memory = sizeof(linux_details) + sizeof(mac_os_details) + sizeof(windows_details)
int union_memory = max(sizeof(linux_details), max(sizeof(mac_os_details), sizeof(windows_details)))
```

While writing this blog I came to know about this benefit which is utilized in low resource devices.

### Pros and Cons
Now the union logic isn't on user but instead on the language runtime itself to manage. It brings in **safety** and **clarity** of usage to the end user of language i.e. the programmer but it also adds in **un-safety** around same **memory** utilization for all the fields.

What do I mean by memory un-safety? let's consider below example of memory overwrite.
```c
union random_data {
  int happiness_index;
  int sadness_index;
} data_holder;

data_holder.happiness_index = 5;
// below assignment will override happiness_index
data_holder.sadness_index = 2;
printf("happiness_index is %d and sadness_index is %d", data_holder.happiness_index, data_holder.sadness_index)
// happiness_index is 2 and sadness_index is 2
```
As we can see a wrong usage of union can cause **loss of data** as only *one field can exist in the union* because they share **same memory space**. This is a simple example of memory **overwrite**, in a mix of structs and primitive data types we face a even bigger threat.

## Safe Sum
There are other languages as well which provide union/sum types with **memory safety** like `Haskell`, `OCaml`, etc. but I would like to go with **Rust** here as am familiar with it.

In rust there is no special `union` type instead `enum` values can hold the data we need and it make our lives easy.
```rust
enum OsTypeEnum {
  Windows,
  Linux(String),
  MacOS,
}

struct Os {
  os_type: OsTypeEnum,
  organization: String,
  release_year: i32,
  version: f32,
  opensource: bool,
}
```
That's it so simple so elegant ~~just looking like a wow~~.

## Pattern Matching
While in `C` even with union type we still had to rely on the `os_type_enum` to check what operating is the `os` struct representing and a **user error** there would result in memory issues.

Modern languages have **pattern matching** which allows them to match against the **structure of types**, both complex and simple in a very clean manner.
```rust
match os_type {
  OsTypeEnum::Windows => print!("Hail Microsoft!"),
  OsTypeEnum::MacOS => print!("richie rich :P"),
  OsTypeEnum::Linux(description) => print!("never ending suffering {}", description)
}
```

In rust we can pattern match against things like:
- Literals
- Destructured arrays, enums, structs, or tuples
- Variables
- Wildcards
- Placeholders

You can read more about the capabilities of rust specific pattern matching in [the rust book](https://doc.rust-lang.org/book/ch18-00-patterns.html).

## Other Languages
Not every language has sum type or pattern matching but most of the languages are moving towards enabling it, not in a true manner but something is better than nothing ~~coughs in golang~~.

### C Sharp
It has become a language that I have started **liking a lot**. C# has no **true equivalent** to union type like **C** or **Rust** but we can provide similar feature using **inheritance** and pattern matching.

I took reference from a [blog](https://spencerfarley.com/2021/03/26/unions-in-csharp/) which goes in detail about *improvements* made till **C#9** to allow below example with  a very clean syntax.
```csharp
record OsType {
  public record Windows : OsType;
  public record Linux(string distro) : OsType;
  public record MacOS : OsType;
  private OsType() { } // private constructor can prevent derived cases from being defined elsewhere
}
```

C ~~Hash~~ Sharp also provides pattern matching abilities using the `switch` statement but it won't be able to do an exhaustive match.
```csharp
osType switch {
  OsType.Windows windows => "its updating",
  OsType.Linux linux => $"where are the display drivers: {linux.distro}",
  OsType.MacOS macOS => "flexing that half eaten apple",
  _ => throw new ArgumentException(message: "invalid OsType value", paramName: nameof(osType)),
};
```

### Java
In Java we have **records**, **pattern matching** and **sealed interfaces** as part of **Java17** which can allow us to implement union types.
```java
public sealed interface OsType {}
public record Linux(String Distribution) implements OsType {}
public record MacOS() implements OsType {}
public record Windows() implements OsType {}
```

For pattern matching we can use the `switch` and `isInstanceOf` to do exhaustive matching with a sealed interface.
```java
switch (osType) {
  case LinuxInformation linux -> "I use arch btw";
  case MacOS macOS -> "loan installment pending";
  case Windows windows -> "even dad can use it";
}
```

### Kotlin
My new found **love** does union types mostly like java but instead of interface we use a **sealed class**, **data objects** and **data classes**. Data Class seems **superior** to Java records as they can extend other classes whereas a record can't.
```kotlin
sealed class OsType private constructor() {
  data class Linux(val distribution: String) : OsType()
  data object MacOS : OsType()
  data object Windows : OsType()
}
```

The pattern matching happens using `when`
```kotlin
when (os) {
  // smart casting happening here
  is Os.Linux -> "mr. robot uses $(os.distribution)"
  is Os.MacOS -> "no more space left"
  is Os.Windows -> "its AI everywhere"
}
```

## Conclusion
**Union/Sum Types** are **concrete types** even in the face of diverse options. `C` introduced it to us long back when it was a **crude mathematical model** and it has been improved thoroughly now with time and is visible in **modern languages** like `Rust`, `OCaml`, `Scala`, etc.

The old gods like `C#`, `Java`, etc. are trying to keep up with *trendy types* by adding more new feature but it just **doesn't feel as good**. I was even planning to show example for doing it with `Go` but it just can't do that in a *humanely readable way*.

![jai shree ram](https://media.giphy.com/media/Y0IWXOPVPjaWsQaRYl/giphy.gif)

That was all for this week, thanks for reading, stay tuned on the [Backpacking Dream](https://king-11.github.io/blog/) and **Jai Shree Ram!!**.
