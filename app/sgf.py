class Node:
  def __init__(self, parent):
    self.id = -1
    self.parent = parent
    self.children = []
    self.actions = []

  def add_child(self, child):
    self.children.append(child)

  def add_action(self, prop, val):
    self.actions.append({
      'prop': prop,
      'value': val
    })

class SGF:
  def __init__(self):
    self.max_node_id = -1

  def __parse_actions(self, action_str):
    actions = []
    start = 0
    bracket_index = action_str.find(']', start)
    last_action_prop = ''

    while bracket_index != -1:
      i = action_str.find('[', start)
      prop = action_str[start: i].strip().upper()
      value = action_str[i+1: bracket_index].strip()
      actions.append({
        'prop': last_action_prop if prop == '' else prop,
        'value': value
      })

      last_action_prop = last_action_prop if prop == '' else prop
      start = bracket_index + 1
      bracket_index = action_str.find(']', start)

    return actions

  def __parse_var(self, root, sgf_str):
    parent = root
    node_str_list = sgf_str.split(';')
    for i in range(1, len(node_str_list)):
      node = Node(parent)
      node.actions = self.__parse_actions(node_str_list[i])
      # handle id stored as an action
      for j in range(0, len(node.actions)):
        action = node.actions[j]
        if (action['prop'] == 'ID'):
          id = int(action['value']) # exception could be thrown
          if id < 0:
            raise ValueError('Invalid ID: ' + id)
          node.id = id
          if id > self.max_node_id:
            self.max_node_id = id
          del node.actions[j]
          break
      parent.add_child(node)
      parent = node

    return parent

  def __is_sem_valid(self, sgf_str, i):
    i_left = i
    i_right = i
    while i_left >= 0:
      if sgf_str[i_left] == '[':
        break
      if sgf_str[i_left] == ']':
        return True
      if i_left == 0:
        return True
      i_left -= 1
    while i_right < len(sgf_str):
      if sgf_str[i_right] == ']':
        break
      if sgf_str[i_right] == '[':
        return True
      if i_right == len(sgf_str) - 1:
        return True
      i_right += 1

    return False

  def __find_valid_prts_match(self, sgf_str, i):
    if sgf_str[i] != '(':
      raise ValueError('Matching parenthesis with other characters: ' + sgf_str[i])
    if not self.__is_sem_valid(sgf_str, i):
      raise TypeError('Parenthesis at index is not semantically valid')
    cnt = 0
    while i < len(sgf_str):
      if sgf_str[i] == '(' and self.__is_sem_valid(sgf_str, i):
        cnt += 1
      elif sgf_str[i] == ')' and self.__is_sem_valid(sgf_str, i):
        cnt -= 1
      if cnt == 0:
        return i
      i += 1

    return -1

  def __find_var_end_idx(self, sgf_str, i):
    while i < len(sgf_str):
      if sgf_str[i] == '(' or sgf_str[i] == ')':
        if self.__is_sem_valid(sgf_str, i):
          return i
      i += 1

    return -1

  def __parse_helper(self, sgf_str, root, i):
    parent = root
    while i < len(sgf_str):
      if sgf_str[i].isspace():
        i += 1
      elif sgf_str[i] == ')':
        i += 1
      elif sgf_str[i] == ';':
        end = self.__find_var_end_idx(sgf_str, i)
        if end == -1:
          raise ValueError('Invalid SGF String')
        next = end if sgf_str[end] == '(' else (end+1)
        parent = self.__parse_var(parent, sgf_str[i:end])
        i = next
      elif sgf_str[i] == '(':
        end = self.__find_valid_prts_match(sgf_str, i)
        if end == -1:
          raise ValueError('Invalid SGF String')
        self.__parse_helper(sgf_str[i+1:end+1], parent, 0)
        i = end + 1
      else:
        raise ValueError('Invalid SGF String')

  # add_id will be implemented when needed
  
  def parse(self, sgf_str):
    root = Node(None)
    self.__parse_helper(sgf_str, root, 0)
    self.max_node_id = -1
    return root
