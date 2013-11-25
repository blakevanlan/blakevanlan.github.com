---
title: A Foray into Redis
layout: blog-post
tab: blog
---

A few months ago, the company I was working for at the time, [Fannect](http://www.fannect.me), needed a job queue with the ability to be parallelizable but also a mechanism to ensure that two conflicting jobs don't run at the same time. After poking around a bit I realized the time has come to use Redis for more than just a session store. This post will explain the design of [jobQ](https://github.com/blakevanlan/jobQ), the open source job queue I ended up developing, and the issues I ran into while building it.
<!-- end excerpt -->

## Starting Off

Through my research, I stumbled across a very full featured job queue intuitively dubbed [Kue](http://learnboost.github.io/kue/). At the time, it didn't offer any kind of locking mechanism but it did serve as good inspiration. I decided to heavy base the external API off of Kue but I wanted to make use Redis's pub/sub messaging (Kue uses polling).

One of the awesome features Redis provides is its publish/subscribe messaging system. For those of you unfamiliar with Redis pub/sub [read this](http://en.wikipedihttp://redis.io/topics/pubsub)! 

## The Design

Below is a diagram depicting the overall flow of a worker:

![Job Queue Design](/images/blog/redis/JobQueueDesign.png)

And for you text-based folks, here it is in words! The worker first looks for a job. If one is available it attempts to acquire the lock for that specific job. If the worker succeeds in acquiring the lock, it preceeds to process the job and then start the process over. If the worker fails to acquire the lock, it skips that job and looks for the next available job. When no available jobs remain in the queue, the worker goes into a waiting mode by subscribing to the <code><span class="s1">'new_job'</span></code> channel. This channel is published to every time a new job enters the queue.

Here's the code for subscribing to a channel. In this example, and all the following ones, the [<code>node_redis</code>](https://github.com/mranney/node_redis) npm package is being used and <code>this.redis</code> is a redis client instance. The example is quite abbreviated to get to the meat and potatoes.

{% highlight javascript %}
// set up an event handler
var Worker = function (redisClient) {
   this.redis = redisClient;
   redis.on('message', function (channel, message) {
      // look for the next job
   });
}

Worker.prototype._wait = function (cb) {
   // Subscribe so it activates when a job is added
   this.redis.subscribe('new_job', (function (err) {
      // sets the internal state to be 'waiting'
   });
};
{% endhighlight %}

### Acquiring the Lock

The only really tricky aspect of the worker is the acquiring of a lock. The lock is just a key-value pair stored in Redis with an expiration (to avoid the chance of a job that has died from locking up the queue). A workaround has to be employed because of the lack of a <code>setnxex</code> command (a combined setnx and expire command). The [<code>setnx</code>](http://redis.io/commands/setnx) command sets a key to a value only if the key does not already exist. For our purposes this is perfect. If we attempt to use setnx on a lock and it fails we know that it is already in use. The [<code>expire</code>](http://redis.io/commands/setex) command sets the expiration for a key. We need a combination of the two to ensuring that a client crash between the <code>setnx</code> and the <code>expire</code> won't produce a "perma-lock". My use of "perma-lock" is describing the situation in which a client sets a lock but crashes before an expire can be set  consequently that lock will never be "unlocked" (deleted); hence, "perma-lock".

### The Workaround

The workaround ensures that 1). a key does not get overridden and 2). a client crash doesn't produce a "perma-lock". This is done by <code>setnx</code>ing a __temporary__ key-value pair followed by an <code>expire</code>. Then comes the important part, a [<code>renamenx</code>](http://redis.io/commands/renamenx) is used to rename the temporary key to the actual lock key but fails if the key already exist. This only works because renamenx carries over the expiration so even if a client crashes between any of the calls we are in a safe state. Here's a code example:

{% highlight javascript %}
var rand = Math.round(Math.random() * new Date());
var lockKey = 'lock:' + jobLock;
var tempKey = 'temp:' + jobLock + '-' + rand;
this.redis.multi()
   .setnx(tempKey, true)
   .expire(tempKey, 1200)
   .renamenx(tempKey, lockKey)
   .exec(function (err, replies) {

   // if the last reply failed then the lock wasn't acquired
   if (replies[replies.length - 1] == 0) {
      this.redis.del(tempKey);
      // restart and look for the next job
   } else {
      // lock acquired; now process!
   }
});
{% endhighlight %}

## Redis Client Reconnects

There was only one other issue that stumped me for awhile. After implementing all the pieces described above, everything seemed to work for around 30 minutes before the worker would stop processing. After some (a lot) of hair pulling, I finally thought to <code>console.log</code>ged when the Redis clients were emitting <code><span class="s1">'end'</span></code>, meaning the underlining connection was closed. This lead me to discover that the Redis clients were cycling and if the worker was in a waiting state (subscribed to <code><span class="s1">'new_job'</span></code> channel) when the cycling occurred then that worker would not properly receive messages after the reconnect. The fix was simply to unsubscribe and then resubscribe when the client was up again.

{% highlight javascript %}
var Worker = function (redisClient) {
   this.redis = redisClient;
   
   // .. (removed for abbreviation)
   
   this.redis.on('end', (function () {
      this.redis.unsubscribe('new_job');
   }).bind(this));

   this.redis.on('ready', (function () {
      // Reconnect to subscribe if in waiting state
      if (this.state == 'waiting') {
         this.redis.subscribe('new_job', function (err) {
            // handle error
         });
      }
   }).bind(this));
}; 
{% endhighlight %}

## Wrapping it Up

To conclude, Redis is a powerful tool and should be viewed as more than a fast session store. Redis's commands are highly flexible and the pub/sub messaging is straightforward, simple and efficient.

The full code for jobQ can be found at [https://github.com/blakevanlan/jobQ](https://github.com/blakevanlan/jobQ) and I welcome any pull requests!