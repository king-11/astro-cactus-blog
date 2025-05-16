---
title: Beautiful Code
description: What is beautiful code? The one that is readable, maintainable and easy
  to modify going forward. But you have already written some code and its time to
  make the refactor so that it can survive the test of time. We can gradually "tidy"
  to be beautiful again.
tags:
- tech
- clean-code
publishDate: 2024-04-13
coverImage:
  src: beautiful-code.webp
  alt: Beautiful Code
---
Let's first try to answer what is software design?

From a very basic definition "*its the relationship between elements of our software*". Now, the part about good software design is that it creates relationship that provide **benefits** in terms of cost associated with making changes to system and its overall working.

>The biggest cost of code is the cost of reading and understanding it, not the cost of writing it.

In the age of `Copilot` and `ChatGPT` its more than easy to **write** code these days. But most of you might have felt that what it generates might work but many a times its incorrect, ugly looking and uses old APIs. The role of human beings is now to modify this for **accurateness, maintainability** and **modern API** usage.

So now we should identify how can we **tidy** our code using small changes to gradually move towards the end goal of getting large benefits out of the software design we end up with.

## What to Tidy?
Let's identify small changes that you can make to your code going forward.

**Guard Clause** checks for conditions which hamper the flow of our software. Instead of doing a conditional check on when to do something, we go towards when not to do something
```rust
// instead of doing this
if condition {
	// do something
}
else {
	return None
}
// we can guard the correct flow
if !condition {
	return None
}
// do something
```

**Delete Dead Code**: This is very easy don't comment dead code instead just remove it and commit. The history is maintained by git for you just add a proper title so that you can identify and retrieve it again in future if required.

**Normalize Symmetries**: Use consistent patterns across the code. Don't do a mix of things. For example if you prefer using `Option` over `Result` just use it throughout the code.
```rust
// using Option
fn checked_return(val: String) -> Option<String> {
	if (!val.contains("target")) {
		return None
	}
	Some(val)
}
// using Result
fn another_checked_return(val: String) -> Result<String, Box<dyn Error>> {
	if (!val.contains("target")) {
		return Err(Error::from("doesn't contain target"))
	}
	Ok(val)
}
```

**New Interface, Old Implementation**: If you wish the API was more adjusted to your needs just create a pass through interface by creating an abstraction over the old API.
```rust
// instead of doing multiple operation on existing interface
fn secret_key(req: &Request) -> i32 {
	let headers = req.headers;
	let value = req.content
	headers.length * value * 42 // solution of universe
}

// create a new interface
trait Secret {
	fn secret(&self) -> i32
}
// use the existing methods
impl Secret for Request {
	fn secret(&self) -> i32 {
		let headers = self.headers;
		let value = self.content
		headers.length * value
	}
}
// start using the new interface
fn secret_key(secret: &Secret) -> i32 {
	secret.secret() * 42
}
```

**Reading Order**: Reorder the code in the file in the order in which a reader would prefer to encounter it.
- Sometimes you want to understand the **primitives** first and then understand how they *compose*.
- Sometimes you want to understand the abstracted **API** first and then understand the details of *implementation*.

**Cohesion Order**: Reorder the code so the elements you need to change are adjacent and not widely dispersed.

It works for routines in a file if two routines are coupled, put them next to each other. It also works for files in directories: if two files are coupled, put them in the same directory.

But the best is to decouple if `cost(decoupling) + cost(change) < cost(coupling) + cost(change)`

**Declaration and Initialization**: Variables and their initialization seem to drift apart sometimes. By the time you get to the initialization, you’ve forgotten some of the context of what the variable is _for_. So just bring them back together.
```rust
let random_number: i32;
// code that doesn't use random_number
random_number = 42;

// instead just declare and initalize simulatenously
let random_number = 42;
```

**Explaining Variables**: When you understand a part of a big, hairy expression, extract the subexpression into a variable named after the intention of the expression.
```rust
return Point::new(
	// ...big long expression...,
	// ...another big long expression...
)

// extract into variables with better names :P
let x = ...big long expression...
let y = ...another big long expression...
return Point::new(x, y)
```

**Explaining Constants**: Replace uses of the literal values with a symbolic constant.
```rust
// instead of using literal
if response.code == 404

// create a symbol
const PAGE_NOT_FOUND = 404
if response.code == PAGE_NOT_FOUND
```

**Chunk Statements**: You’re reading a big chunk of code and you realize, “Oh, this part does _this_ and then that part does _that_.” Put a blank line between the parts.

### Extract Method
We can extract chunks of our code into separate methods which make it easier to change things enveloped in a smaller method as compared to a single big routine.

#### Explicit Parameters
You’re reading some code you want to change, and you notice that some of the data it works on wasn’t passed explicitly to the routine, **Split the routine**.

The top part gathers the parameters and passes them explicitly to the second part.
```rust
fn create_connection(server_details: HashMap<string, string>) -> Connection {
	let username = server_details.get("username").unwrap();
	let password = server_details.get("password").unwrap();
	let server_endpoint = env::var("SERVER_ENDPOINT").expect("server endpoint not in environment");
	let database_name = env::var("DATABASE_NAME").expect("database name not in environment");

	let database_key = Hash::new(username, password);
	return Connection::new(server_endpoint, database_name, database_key);
}

// instead call this function after collecting all the parameters from hash map and env vars
fn create_connection_body(
	username: &str,
	password: &str,
	server_endpoint: &str,
	database_name: &str) -> Connection
{
	let database_key = Hash::new(username, password);
	return Connection::new(server_endpoint, database_name, database_key);
}
```

#### Extract Helper
When you see a block of code inside a routine that has an obvious purpose and limited interaction with the rest of the code in the routine. Extract it as a helper routine.
```rust
// unrelated code
let file_name = Hash::new(transaction_id, 42);
let transaction_value = fs::read(file_name);
// do some things with transaction value

// instead extract the helper
fn get_transaction_value(transaction_id: &str) -> String {
	let file_name = Hash::new(transaction_id, 42);
	return fs::read(file_name);
}

let transaction_value = get_transaction_value();
```

### One Pile
In case your code has the following symptoms:
- Long, repeated argument lists
- Repeated code, especially repeated conditionals
- Poor naming of helper routines
- Shared mutable data structures

You will start seeing multiple possible tidying's at once and its a _mess_ if you start doing them one after another. In such a case instead **inline** as much of the code as you need until it’s all in one big pile, **Tidy** from there.

As the pile gets bigger, the shape will start to emerge in your my mind of what is happening here and how can you restructure it.

### Comments
When you’re reading some code and you say, “Oh, so _that’s_ what’s going on!” That’s a **valuable** moment. Record it. If you encounter a file with no header comment, consider adding a header telling prospective readers why they might find reading this file useful.

Write down only what _wasn’t obvious_ from the code. What is it that you would have liked to have known? When you see a comment that says exactly what the code says, remove it as its redundant.

## How to Tidy?
Group structural changes together not **too large** for the review to get delayed just sufficient enough. Don't mix them with behavioural changes as it would be too much for a reviewer to provide useful feedback on.

**Batching** tidying's into small batches is important otherwise the changes can cause others to face difficult to handle **merge conflicts** and along with that the more changes you make once increases the probability of having interaction with piece of code resulting into **regressions**.

Sometimes while working on behavioural changes you end up making a lot of tidying's and end up with a tangled commit history. **Start over**, but tidy first this time so that's easier for the reviewer to understand your approach.

>Untangling a ball of yarn starts with noticing that you have a tangle. The sooner you realize the need to untangle, the smaller the job is

## When to Tidy?
So how do we actually decide when is the time to tidy code.
- **Never**, when you are never changing this code again and there is nothing to learn from changing it.
- **Later**, when you have a big batch of tidying and there is an eventual payoff. So you do tidying after the current task is completed.
- **After**, when waiting until next time is expensive and you will probably forget the context. So you add it at end of current task.
- **First**, when the pay off is immediate with improved understanding or cheaper behavioural change.

## Where to go next?
I have been reading [Tidy First?](https://www.oreilly.com/library/view/tidy-first/9781098151232/) and its a very **elegant** and **simple** introduction to go **software design patterns**. This blog is more like a summary that I wrote for myself to remember these principles going forward.

I highly recommend anyone to read technical books rather than relying on tutorials to gather deep knowledge and better their understanding of software.

![thanks gif](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHZzbnVqOGRjNGY4MWo4MGtubDM3NWQ0ZTVzdmN0YWJ1OTc3N3A0OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/u0bQN6bxXweHe/giphy.gif)

Thanks for reading the blog, been sometime since I wrote one. The list of my *blogs to write* has been increasing for sometime and due to travel I was skipping on it but not anymore. Time to get the keyboard going again!
