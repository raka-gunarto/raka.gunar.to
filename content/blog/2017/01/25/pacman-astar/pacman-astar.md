---
title: Pacman A* Pathfinding
description: Solving pacman A* on hackerrank
date: 2017-01-25
tags: ["old"]
---

In this problem we use the A* pathfinding algorithm to traverse a maze.

## Here is the problem statement:

### Input Format

The first line contains 2 space separated integers which is the position of the PacMan.
The second line contains 2 space separated integers which is the position of the food.
The third line of the input contains 2 space separated integers. Indicating the size of the rows and columns respectively.
This is followed by row (r) lines each containing column (c) characters. A wall is represented by the character ‘%’ ( ascii value 37 ), PacMan is represented by UpperCase alphabet ‘P’ ( ascii value 80 ), empty spaces which can be used by PacMan for movement is represented by the character ‘-‘ ( ascii value 45 ) and food is represented by the character ‘.’ ( ascii value 46 )

The top left of the grid is indexed (0,0) and the bottom right of the grid is indexed (r-1,c-1)

The grid is indexed as per matrix convention

For the sake of uniformity across all codes, cost to reach a neighboring node

0 if a food is present.
1 otherwise.
Output Format

Each cell in the grid is represented by its position in the grid (x,y). PacMan can move only UP, DOWN, LEFT or RIGHT. Your task is to print all the nodes in the shortest path calculated using Astar search between Pacman and Food.

```z
 %
%--
 -
```

In the above cell, LEFT and UP are invalid moves. You can either go RIGHT or DOWN. RIGHT is populated first followed by DOWN. i.e., populate the queue UP, LEFT, RIGHT and DOWN order so that UP gets popped first from the queue.

Print the distance ‘D’ between the source ‘P’ and the destination ‘.’ calculated using Astar. D+1 lines follow, each line having a node encountered between ‘P’ and ‘.’ both included. D+1 lines essentially representing the path between source and the destination.

### Sample Input

```z
35 35
35 1
37 37
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%-------%-%-%-----------%---%-----%-%
%-%%%%%%%-%-%%%-%-%%%-%%%-%%%%%%%-%-%
%-------%-------%-%-----%-----%-%---%
%%%%%-%%%%%-%%%-%-%-%-%%%-%%%%%-%-%%%
%---%-%-%-%---%-%-%-%---%-%---%-%---%
%-%%%-%-%-%-%%%-%%%%%-%%%-%-%%%-%%%-%
%-------%-----%---%---%-----%-%-%---%
%%%-%%%%%%%%%-%%%%%%%-%%%-%%%-%-%-%-%
%-------------%-------%-%---%-----%-%
%-%-%%%%%-%-%%%-%-%-%%%-%-%%%-%%%-%-%
%-%-%-----%-%-%-%-%-----%---%-%-%-%-%
%-%-%-%%%%%%%-%-%%%%%%%%%-%%%-%-%%%-%
%-%-%-%-----%---%-----%-----%---%---%
%%%-%%%-%-%%%%%-%%%%%-%%%-%%%-%%%%%-%
%-----%-%-%-----%-%-----%-%---%-%-%-%
%-%-%-%-%-%%%-%%%-%%%-%%%-%-%-%-%-%-%
%-%-%-%-%-----------------%-%-%-----%
%%%-%%%%%%%-%-%-%%%%%-%%%-%-%%%-%%%%%
%-------%-%-%-%-----%---%-----%-%---%
%%%%%-%-%-%%%%%%%%%-%%%%%%%%%%%-%-%%%
%---%-%-----------%-%-----%---%-%---%
%-%%%-%%%%%-%%%%%%%%%-%%%%%-%-%-%%%-%
%-%---%------%--------%-----%-------%
%-%-%-%%%%%-%%%-%-%-%-%-%%%%%%%%%%%%%
%-%-%---%-----%-%-%-%-------%---%-%-%
%-%-%%%-%%%-%-%-%-%%%%%%%%%-%%%-%-%-%
%-%---%-%---%-%-%---%-%---%-%-%-----%
%-%%%-%%%-%%%%%-%%%-%-%-%%%%%-%-%%%%%
%-------%---%-----%-%-----%---%-%---%
%%%-%-%%%%%-%%%%%-%%%-%%%-%-%%%-%-%%%
%-%-%-%-%-%-%-%-----%-%---%-%---%-%-%
%-%-%%%-%-%-%-%-%%%%%%%%%-%-%-%-%-%-%
%---%---%---%-----------------%-----%
%-%-%-%-%%%-%%%-%%%%%%%-%%%-%%%-%%%-%
%.%-%-%-------%---%-------%---%-%--P%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
```

So in this sample input, we are given 4 pieces of information

Pacman’s position (35,35), which is also identified by the letter P in the grid later
Position of the food (35,1), which is also later identified by the character ‘.’ in the grid
The size of the grid (37×37)
The grid itself, ‘%’ for a wall ‘-‘ for a free space, ‘P’ for Pacman’s starting position and ‘.’ for the position of the food.
Note that the size of the grid is based on the number of characters in the length and width, but the positions are given per matrix convention, where the columns and rows are numbered starting on zero and the row number goes up as it goes down on the y axis.

So the problem is asking us to solve this using the A* pathfinding algorithm.

So the way the A* pathfinding algorithm works is using heuristics, which is effectively guessing.

We’ll treat the grid like a graph and each node has a distance of 1 to each other. In A* pathfinding, there is a ‘g’ score for each node, a ‘h’ score and an ‘f’ score. The g score is the distance between the current node and the starting node. The h score is the heuristic value, the distance between the current node and the target node. The f score is those two values combined. Distance is calculated however you want, since this is a rectangular grid with uniformly sized and distanced cells, you can calculate the straight line distance between one node to another. But in this post I will use just simple manhattan distance, which is adding the x difference and the y difference.

The algorithm is quite easy, here is some pseudocode

```py
openNodes = list
closedNodes = list
int xT,yT
node targetNode = (xT,yT)
int xS,yS
node startingNode = (xS,yS)
append starting node to openNodes
while(openNodes is not empty){
    sort openNodes by f score ascending
    take the smallest score node as current
    for each(adjacentNodes){
        adjacentNode.g = distance from start
        adjacentNode.h = estimated distance to target
        adjacentNode.f = adjacentNode.g + adjacentNode.h
        set parent to current node
        if(adjacentNode == targetNode)
           break
        if(adjacentNode not in closedNodes)
           append to openNodes
    }
    append current node to closed nodes
    remove current node from open nodes
}
path = list
node currentNode = targetNode
path.push_front(currentNode)
while(currentNode != startingNode){
    path.push_front(currentNode.parent)
}
path.push_front(startingNode)
```
    
As you can see, the logic process in this is quite simple. It is as follows

Pick the node with the smallest f score and use that as current node
Check adjacent nodes and calculate f score
Set parent to current node and append unless it is in the list closed nodes, remove current from open nodes
Repeat step 1-3 until there are no more open nodes or reach target
Backtrack from parents and add to the front of a list to get the path
Alright so let’s walk through on how to code the solution. I’ll be using C++.

Firstly, we need to create a Node class/struct to easily store each node and its information.

```cpp
class Node{
public:
    int coordX;
    int coordY;
    int distFromStart;
    int heuristicDistFromTarget;
    int totalCost;
    Node(int, int, int, int);
    Node();
};
 
Node::Node(int mX, int mY, int dStart, int hDTarget){
    coordX = mX;
    coordY = mY;
    distFromStart = dStart;
    heuristicDistFromTarget = hDTarget;
    totalCost = dStart + hDTarget;
}
```

I replaced the variable names with more descriptive names like totalCost instead of fScore to make it easier to understand

Now, let’s focus on creating the pathfinding function.

Firstly we need a list of open nodes and closed nodes. We can simply declare two lists in our pathfinding function. We use a vector of pairs for the closed nodes list so we don’t need to create a comparison overload for the Node class.

```cpp
deque<pair<Node, int>> openNodes;
vector<pair<int, int>> closedNodes;
```

We use a double ended queue for openNodes so we can use .pop_front, which pops the first element out of the list, since we’ll be checking that one each time after sorting the double ended queue.

Next, we need something to be able to store the parents of a node. Here we’ll use a map, which has a pair of ints (the coordinates of a node) as the key and value. The reason we use a map is a node can have multiple parents belonging to different paths, due to the nature of the algorithm, any overwrites will be better than the old parent, and a map can only store one value for each key. And we can use the coordinates as a key instead of having to search through a list. The reason we don’t store parent information in the nodes itself is that it might change, and if we have to change it we’ll have to search through the nodes list, which is time consuming.

```cpp
map<pair<int,int>,pair<int,int>> parents;
```

Now for a few utility functions. We need to check if adjacent coordinates actually exist, so we’ll create a withinBounds function that takes a Node object, the X size of the grid and the Y size of the grid.

```cpp
inline bool withinBounds(Node node, int sizeX, int sizeY){
    if(node.coordX >= 0 && node.coordX < sizeX && node.coordY >= 0 && node.coordY < sizeY)
        return true;
    return false;
}
```

Simple right? Just checking if the x and y values are greater or equal to zero and less than the maximum x or y.

Now we need a sort utility function to sort the openNodes list by the f score. We will use the sort() function in the “algorithm” header file, but since this is our own object, we need to create the sort function.

```cpp
bool heuristicsSort(const Node& node1, const Node& node2) {
    return node1.totalCost < node2.totalCost;
}
```
Now we will write the algorithm part of the solution. Please note that the problem guarantees a solution, so I will not have conditions where a solution is node found.

```cpp
Node nodeExplore(int startX, int startY, int foodX, int foodY, int mSizeX, int mSizeY){ 
    while (true){
        sort(openNodes.begin(), openNodes.end(), heuristicsSort);
        Node curNode = openNodes[0].first;
         
        int xyUp[2] = { curNode.coordX, curNode.coordY - 1 };
        int xyDown[2] = { curNode.coordX, curNode.coordY + 1 };
        int xyLeft[2] = { curNode.coordX - 1, curNode.coordY };
        int xyRight[2] = { curNode.coordX + 1, curNode.coordY };
 
        if (withinBounds(Node(curNode.coordX, curNode.coordY - 1,0,0),mSizeX,mSizeY)){ //Check within bounds XY
            if (gameMap[xyUp[1]][xyUp[0]] != '%'){ // Check if not wall                
                //Ready to add to queue
                //Check the dist from start
                int distStart = curNode.distFromStart + 1;
                //Heuristic dist from target
                int distTarget = abs(xyUp[0] - foodX) + abs(xyUp[1] - foodY);
                pair<int, int> upNodeXY = make_pair(xyUp[0], xyUp[1]);
                if (find(closedNodes.begin(), closedNodes.end(), upNodeXY) != closedNodes.end()) { //Check if node is already closed
                    //It is a closed node <img draggable="false" role="img" class="emoji" alt="😦" src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/svg/1f626.svg">
                }
                else {
                    Node upNode(upNodeXY.first, upNodeXY.second, curNode, distStart, distTarget);
                    parents[make_pair(xyUp[0], xyUp[1])] = make_pair(curNode.coordX, curNode.coordY);
                    openNodes.push_back(make_pair(upNode, upNode.totalCost));
                    if (upNodeXY.first == foodX && upNodeXY.second == foodY){ // FOUND TARGET!
                        return upNode;
                    }
                }
            }
        }
        if (withinBounds(Node(curNode.coordX, curNode.coordY + 1,0,0),mSizeX,mSizeY)){ //Check within bounds XY
            if (gameMap[xyDown[1]][xyDown[0]] != '%'){ // Check if not wall                
                //Ready to add to queue
                //Check the dist from start
                int distStart = curNode.distFromStart + 1;
                //Heuristic dist from target
                int distTarget = abs(xyDown[0] - foodX) + abs(xyDown[1] - foodY);
                pair<int, int> upNodeXY = make_pair(xyDown[0], xyDown[1]);
                if (find(closedNodes.begin(), closedNodes.end(), upNodeXY) != closedNodes.end()) { //Check if node is already closed
                    //It is a closed node <img draggable="false" role="img" class="emoji" alt="😦" src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/svg/1f626.svg">
                }
                else {
                    Node upNode(upNodeXY.first, upNodeXY.second, curNode, distStart, distTarget);
                    parents[make_pair(xyDown[0], xyDown[1])] = make_pair(curNode.coordX, curNode.coordY);
                    openNodes.push_back(make_pair(upNode, upNode.totalCost));
                    if (upNodeXY.first == foodX && upNodeXY.second == foodY){ // FOUND TARGET!
                        return upNode;
                    }
                }
            }
        }
        if (withinBounds(Node(curNode.coordX - 1, curNode.coordY,0,0),mSizeX,mSizeY)){ //Check within bounds XY
            if (gameMap[xyLeft[1]][xyLeft[0]] != '%'){ // Check if not wall                
                //Ready to add to queue
                //Check the dist from start
                int distStart = curNode.distFromStart + 1;
                //Heuristic dist from target
                int distTarget = abs(xyLeft[0] - foodX) + abs(xyLeft[1] - foodY);
                pair<int, int> upNodeXY = make_pair(xyLeft[0], xyLeft[1]);
                if (find(closedNodes.begin(), closedNodes.end(), upNodeXY) != closedNodes.end()) { //Check if node is already closed
                    //It is a closed node <img draggable="false" role="img" class="emoji" alt="😦" src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/svg/1f626.svg">
                }
                else {
                    Node upNode(upNodeXY.first, upNodeXY.second, curNode, distStart, distTarget);
                    parents[make_pair(xyLeft[0], xyLeft[1])] = make_pair(curNode.coordX, curNode.coordY);
                    openNodes.push_back(make_pair(upNode, upNode.totalCost));
                    if (upNodeXY.first == foodX && upNodeXY.second == foodY){ // FOUND TARGET!
                        return upNode;
                    }
                }
            }
        }
        if (withinBounds(Node(curNode.coordX + 1, curNode.coordY,0,0),mSizeX,mSizeY)){ //Check within bounds XY
            if (gameMap[xyRight[1]][xyRight[0]] != '%'){ // Check if not wall                
                //Ready to add to queue
                //Check the dist from start
                int distStart = curNode.distFromStart + 1;
                //Heuristic dist from target
                int distTarget = abs(xyRight[0] - foodX) + abs(xyRight[1] - foodY);
                pair<int, int> upNodeXY = make_pair(xyRight[0], xyRight[1]);
                if (find(closedNodes.begin(), closedNodes.end(), upNodeXY) != closedNodes.end()) { //Check if node is already closed
                    //It is a closed node <img draggable="false" role="img" class="emoji" alt="😦" src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/svg/1f626.svg">
                }
                else {
                    Node upNode(upNodeXY.first, upNodeXY.second, curNode, distStart, distTarget);
                    parents[make_pair(xyRight[0], xyRight[1])] = make_pair(curNode.coordX, curNode.coordY);
                    openNodes.push_back(make_pair(upNode, upNode.totalCost));
                    if (upNodeXY.first == foodX && upNodeXY.second == foodY){ // FOUND TARGET!
                        return upNode;
                    }
                }
            }
        }
        closedNodes.push_back(make_pair(curNode.coordX, curNode.coordY)); // Put it in closed nodes now
        openNodes.pop_front(); //Remove this node from openNodes
    }
}
```

Now while this isn’t the most efficient code, it works for it’s purpose and I have tried to make it as descriptive and readable as possible.

So it is an infinite loop that will keep cycling until it reaches the target node, and then returns that node.

There is really one main evaluation function repeated four times for each adjacent node.

So first we check if our node is within the bounds of the map:

```cpp
withinBounds(Node(curNode.coordX, curNode.coordY - 1,0,0),mSizeX,mSizeY)
```

Then we check if it isn’t a wall:

```cpp
gameMap[xyUp[1]][xyUp[0]] != '%'
```

We then calculate the distances and costs of the node:

```cpp
//Check the dist from start
int distStart = curNode.distFromStart + 1;
//Heuristic dist from target
int distTarget = abs(xyUp[0] - foodX) + abs(xyUp[1] - foodY);
```

Then we check if the node is closed:

```cpp
find(closedNodes.begin(), closedNodes.end(), upNodeXY) != closedNodes.end())
```

If it isn’t we create the node, push it to openNodes, add the parent information to the parent map.

```cpp
Node upNode(upNodeXY.first, upNodeXY.second, curNode, distStart, distTarget);
                    parents[make_pair(xyUp[0], xyUp[1])] = make_pair(curNode.coordX, curNode.coordY);
                    openNodes.push_back(make_pair(upNode, upNode.totalCost));
```

Now the last thing is to check if it is the target, if yes, then return!

```cpp
if (upNodeXY.first == foodX && upNodeXY.second == foodY){ // FOUND TARGET!
                        return upNode;
                    }
```

That is repeated for all adjacent nodes.

Now after it has returned the node, let’s find the path.

```cpp
deque<pair<int, int>> path;
path.push_back(make_pair(target.coordX, target.coordY));
pair<int, int> curTarget = parents[make_pair(target.coordX, target.coordY)];
while (true){
    path.push_front(make_pair(curTarget.first, curTarget.second));
    try{
        curTarget = parents[curTarget];
    }
    catch (exception& e){
        break;
    }
}
```

This is quite simple, we create a double ended queue called path. Then we keep adding the current node to the front of the queue, then set the current node to its parent. When a parent doesn’t exist that means it is now at the start of the path, so it will raise an exception which we’ll just simply break from. Now the deque path contains the optimal path from Pacman to the food!