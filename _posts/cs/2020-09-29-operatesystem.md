---
title: 'Operatesystem'
date: 2020-09-29T16:57:41+09:00
draft: false
description: 'Operatesystem'
tags: [Operatesystem]
categories: [Operatesystem]
---

# Process

Process is a job registered in kernel

Process control block: Area where store information about each process registered in the kernel
Information of PCB

- Process identification number
- priority
- current state
- pointer
- context save area

Types of processes

- Operate system process  
  Operating system processes control the sequence of process status or monitor processes that are being used to prevent them from intruding into other users or operating system areas.
- User process  
  Run user code
- Parallel process  
  Processes run simultaneously.

Status changing of process

Create > Ready > Run > Termination

- create: Task is registered in kernel
- Ready: The process is allocated all the necessary resources. State waiting for processor assignment
- Run
- Stand by : resource requset by system call
- Termination

---

# Thread

Thread is a unit of execution that separates only control from resources and controls that is a characteristic of a process.

Threads of same process share same adress

Perform thread parallel: Threads in one process are parallel to achieve common objectives  
Worth: Increased user responsiveness, share same resource and memory, Multiprocessing improves performance and efficiency

- Single thread: One thread in one process  
- Multi thread: Threads in one process
- User thread: user level
- kernel thread: kernel level

Thread control block: Execution status, scheduling information

Status changing of thread

- only one unit execute with process
- sequential execution

---

# Scheduling

Scheduling decides when and how to allocate resources.

## Purpose

- Fairness of resource allocation
- Maximize throughput per hour
- Proper return time
- Ensure predictability
- Minimize overhead
- Balance the use of resources
- Balance return time and resources
- Prevent waiting
- Priority
- Maximize opportunity of service useing
- Prevent reducing of service

## Decision criterion

- Working form of process
- Resource preoccupancy rate of process
- Burst time of process
- Remaining execution time of the process

## Performance criterion

- Utilization rate of cpu
- Processing rate
- Return time
- Waiting time
- Response time

## Step of scheduling

1. Job selection
2. Grant of license
3. Allocate processor to prepared process

## Categorized by method

- Preemption Scheduling
- non-priority scheduling

## First come first served scheduling

It is non-priority method and the simplest of scheduling algorithms.  
It is very efficient in batch processing.

## Shortest job first scheduling

This method assigns cpu first to tasks with the shortest execution time.  
Specific: low average waiting time, unfair work

## Priority scheduling

It is a scheduling algorithm that reflects priority according to importance.  
Problem: unfair work -> solution: aging
Advantage: It is possible to know relative importance  
Weakness: unfair work

## Others

- [Round Robin scheduling](https://en.wikipedia.org/wiki/Round-robin_scheduling)  
- [Multilevel Queue Scheduling](https://en.wikipedia.org/wiki/Multilevel_queue)  
- [Multilevel feedback Queue Scheduling](https://en.wikipedia.org/wiki/Multilevel_feedback_queue)  
- [HRRN Scheduling](https://en.wikipedia.org/wiki/Highest_response_ratio_next)

---

# [Precedence Graph](https://en.wikipedia.org/wiki/Precedence_graph)

---

# Fork-join model and parallel sentence
[Fork-join model](https://en.wikipedia.org/wiki/Fork%E2%80%93join_model)

Parallel sentence  
All sentences between parbegin and parend can be performed in parallel.

---

# Concurrent Process
It's about switching processors quickly, making them look like they're running multiple processes at the same time.

Types of process 
- Independent process  
  Parallel processes performed on a single processing system  
  Processes that can be run independently
- Cooperative process  
  An asynchronous process that interacts with other processes and performs certain functions.

[Concurrency](https://en.wikipedia.org/wiki/Concurrency_(computer_science))

[Parallel Computing](https://en.wikipedia.org/wiki/Parallel_computing)

---

# Concurrent Process Interaction
- [Mutual exclusion](https://en.wikipedia.org/wiki/Mutual_exclusion)

- [Synchronization](https://en.wikipedia.org/wiki/Synchronization_(computer_science))

- [Deadlock](https://en.wikipedia.org/wiki/Deadlock)

- [Producer-consumer process](https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem)

- [Race condition](https://en.wikipedia.org/wiki/Race_condition)

---

# [Critical section](https://en.wikipedia.org/wiki/Critical_section)

---

# [Semaphore](https://en.wikipedia.org/wiki/Semaphore_(programming))

---

# [Deadlock](https://en.wikipedia.org/wiki/Deadlock)

- [Spooling](https://en.wikipedia.org/wiki/Spooling)
- [Data buffer](https://en.wikipedia.org/wiki/Data_buffer)

---

# [Memory hierarchy](https://en.wikipedia.org/wiki/Memory_hierarchy)

Consideration of main memory configuration strategy
- Number of processes that can be assigned at the same time
- Amount of main memory that can allocate to each process
- Method of division of main memory
- Continuity of main memory area allocated to process

Main memory management strategy
- Fetch strategy  
The problem of determining when to import the next program or data to be loaded into the main memory.
  - Demand fetch strategy  
  It is a technique that is carried out by a running program.
  - Anticipatory fetch strategy  
  It is a way to predict and move programs that are likely to be required.
- Placement strategy  
It is a strategy that determines where new programs or materials will be placed in the main memory.
- Replacement strategy  
It is a way to decide which program to remove from the main memory to make space.

Memory loading method
- Contiguous memory allocation
  - Uniprogramming
  - Multi programming
    - Fixed partition  
    It is a method of dividing memory into several fixed sizes.
    - Variable partition
- None contiguous memory allocation
  - [Fixed partition-paging](https://en.wikipedia.org/wiki/Paging)
  - [Variable partition-segmentation](https://en.wikipedia.org/wiki/Memory_segmentation)

---

# [Virtual memory](https://en.wikipedia.org/wiki/Virtual_memory)

--

# [Thrashing](https://en.wikipedia.org/wiki/Thrashing_(computer_science))
