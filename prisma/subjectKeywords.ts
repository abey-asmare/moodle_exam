import { Subject } from "../app/generated/prisma/client";

/**
 * Keyword → Subject mapping.
 * The first match wins, so keep specific keywords before more generic ones if needed.
 * All searches are case‑insensitive.
 */
export const keywordSubjectMap: { subject: Subject; keywords: string[] }[] = [
  // ---------- DATABASE SYSTEMS ----------
  {
    subject: Subject.DATABASE_SYSTEMS,
    keywords: [
      // from the first 25 database questions
      "collection of facts", "connection pooling", "odbc", "jdbc",
      "records of a log", "data model", "relational data model",
      "ddl operation", "unstructured textual data", "information retrieval",
      "entity-relationship", "storage manager", "data dictionary cache",
      "row cache", "cartesian product", "join", "semi-structured",
      "database modifications", "sql statement", "logical entity",
      "atomicity and durability", "encryption and decryption",
      "asymmetric-key", "select/from/where", "functional dependencies",
      "er-diagrams", "assertions", "authorization", "domain constraints",
      "referential integrity", "concurrency", "transaction",
      "serializability", "lost updates", "uncommitted data",
      "inconsistent retrievals", "unrepeatable read",
      "write-ahead logging", "wal", "deferred update",
      "immediate update", "shadow paging", "recovery",
      "database security", "inference control", "dba",
      "discretionary access control", "mandatory access control",
      "distributed database", "fragmentation", "replication",
      "transparency", "ddbms", "centralized database",
      // generic
      "database", "sql", "query", "commit", "rollback",
      "acid", "normalization", "index", "schema", "dbms",
    ],
  },

  // ---------- SOFTWARE ENGINEERING (security questions) ----------
  {
    subject: Subject.SOFTWARE_ENGINEERING,
    keywords: [
      "coding vulnerability", "security breaches",
      "identify potential security threats",
      "principle of secure coding", "secure coding",
      "software security", "penetration testing",
      "threat modeling", "vulnerability scanning",
      "code reviews", "input validation",
      "parameterized queries", "primary goal of software security",
      "common software security vulnerability",
      "not a secure coding practice", "hardcoding passwords",
      "secure software development lifecycle",
      "software security testing", "security awareness training",
      "phishing simulations", "common type of software security testing",
      "dynamic analysis technique", "fuzz testing",
      "code review tool", "sonarqube",
      "web application security", "mobile application security",
      "automated penetration testing", "metasploit",
      "cryptographic algorithm", "symmetric-key",
      "public-key", "hashing", "sha-256", "aes", "rsa",
      "digital signature", "key exchange",
      "brute-force attack", "buffer overflow",
      "cross-site request forgery", "csrf",
      "information security", "incident response plan",
      "access control mechanism", "firewalls",
      "purpose of cryptography",
    ],
  },

  // ---------- WEB PROGRAMMING ----------
  {
    subject: Subject.WEB_PROGRAMMING,
    keywords: [
      "javascript", "php", "html", "web",
      // JavaScript
      "javascript data type", "javascript syntax", "innerhtml",
      "getelementbyid", "script", "netscape",
      "advantages of javascript", "javascript ignores",
      "ternary operator", "for loop", "=== and !==",
      "pop up boxes", "alert", "prompt", "confirm",
      "undefined value", "dataypes in javascript",
      "javascript errors", "javascript string",
      "divide by 0", "infinity", "nan",
      "reduceRight", "parseInt", "typeof",
      "++ operator", "onkeydown", "splice method",
      // PHP
      "php is an acronym", "hypertext preprocessor",
      "server-side scripting", ".php", "<?php ?>",
      "echo", "print", "variable scope", "super global",
      "$_server", "$_get", "$_post", "$_global",
      "static variable", "global scope", "local scope",
      "constant", "case-sensitive", "newline character",
      // general web
      "client-side", "browser", "dom", "ajax", "frontend",
      "backend", "http", "url", "form", "cookie", "session",
      "xss", "cross-site", "html element",
    ],
  },

  // ---------- DATA STRUCTURES & ALGORITHMS ----------
  {
    subject: Subject.DATA_STRUCTURES_ALGORITHMS,
    keywords: [
      // pointers & C++
      "int a[4]", "*p,*t", "pointer", "&", "->",
      "structure", "access data members",
      // queues, stacks, trees
      "queue", "stack", "deque", "dequeue",
      "push", "pop", "underflow", "overflow",
      "fifo", "lifo", "linear list",
      "inorder traversing", "preorder traversal",
      "breadth first search",
      // sorting
      "sorting algorithm", "bubble sort", "selection sort",
      "insertion sort", "merge sort", "quick sort",
      "heap sort", "radix sort", "divide and conquer",
      "pivot element", "in-place", "stable sorting",
      "external sorting", "internal sorting",
      // complexity
      "big o", "o(1)", "o(n)", "o(n^2)", "o(n log n)",
      "o(log n)", "time complexity", "space complexity",
      "worst case", "average case", "best case",
      // search
      "linear search", "binary search",
      // linked list
      "linked list", "node", "pointer to node",
      "doubly linked list", "circular linked list",
      // generic
      "data structure", "algorithm", "recursion",
      "execution time", "characteristics of a data structure",
    ],
  },

  // ---------- OPERATING SYSTEMS ----------
  {
    subject: Subject.OPERATING_SYSTEMS,
    keywords: [
      "operating system", "os",
      "command interpreter", "system call",
      "cpu scheduling", "priority", "round robin",
      "shortest job first", "multiprogramming",
      "kernel", "kernel mode", "user mode",
      "memory management", "process scheduling",
      "file system", "device driver",
      "generation of computers", "vacuum tube",
      "transistor", "integrated circuit",
      "microprocessor", "personal computers",
      "magnetic core memory", "stored program",
      "multitasking", "ms-dos", "windows", "unix",
      "linux", "solaris", "android", "ios",
      "scalability", "reliability",
      // specific OS people
      "dennis ritchie", "linus torvalds",
    ],
  },

  // ---------- NETWORKING ----------
  {
    subject: Subject.NETWORKING,
    keywords: [
      "data communication", "computer network",
      "internet layer", "transport layer", "physical layer",
      "mac address", "ip address", "subnet",
      "broadcast address", "limited broadcast",
      "dhcp", "arp", "tcp", "udp", "port number",
      "vlan", "switch", "router", "hub",
      "collision domain", "broadcast domain",
      "csma/ca", "aloha", "token passing", "fdma", "cdma",
      "layered model", "encapsulation", "osi",
      "static routing", "dynamic routing", "bgp", "ospf",
      "distance vector", "link state",
      "nat", "pat", "overloaded-nat",
      "multicast", "class d address",
      "smtp", "ftp", "port 25",
      "tcp three-way handshake", "window size",
      "acknowledgement", "sequence number",
      "wlan", "802.11", "network topology",
      "full-mesh", "star network", "ring network",
      "domain based network", "peer-to-peer",
      "non-routable protocol",
      "dotted-decimal", "/27", "/20", "1st octet rule",
    ],
  },

  // ---------- OTHER SUBJECTS (less common, but included) ----------
  {
    subject: Subject.PROGRAMMING,
    keywords: [
      "c++", "java", "python", "compiler", "syntax",
      "variable", "function", "loop", "conditional",
      "object-oriented", "class", "inheritance", "polymorphism",
      "constructor", "method",
    ],
  },
  {
    subject: Subject.OOP,
    keywords: [
      "oop", "object-oriented", "inheritance",
      "polymorphism", "encapsulation", "abstraction",
      "interface", "abstract class", "method overriding",
    ],
  },
  {
    subject: Subject.MOBILE_DEVELOPMENT,
    keywords: [
      "android", "ios", "mobile app", "flutter", "react native",
      "swift", "kotlin", "objective-c",
    ],
  },
  {
    subject: Subject.REQUIREMENTS_ENGINEERING,
    keywords: [
      "requirement", "functional", "non-functional",
      "user story", "use case", "stakeholder", "elicitation",
    ],
  },
  {
    subject: Subject.ARCHITECTURE_DESIGN,
    keywords: [
      "architecture", "design pattern", "component",
      "deployment", "microservice", "monolith", "model-view",
    ],
  },
  {
    subject: Subject.PROJECT_MANAGEMENT,
    keywords: [
      "project management", "agile", "scrum", "waterfall",
      "sprint", "stakeholder", "risk management", "gantt",
    ],
  },
  {
    subject: Subject.TESTING_QA,
    keywords: [
      "testing", "qa", "unit test", "integration test",
      "regression test", "acceptance test", "test case",
      "bug", "defect", "quality assurance",
    ],
  },
  {
    subject: Subject.EVOLUTION_MAINTENANCE,
    keywords: [
      "maintenance", "refactoring", "legacy", "software evolution",
      "reverse engineering", "reengineering",
    ],
  },
  {
    subject: Subject.AI_ML,
    keywords: [
      "machine learning", "artificial intelligence",
      "neural network", "deep learning", "classification",
      "regression", "clustering", "tensor", "nlp",
      "computer vision",
    ],
  },
];