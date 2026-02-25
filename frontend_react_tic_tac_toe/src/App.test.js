import { render, screen } from '@testing-library/react';
import App from './App';

test('renders tic tac toe title and status', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /tic tac toe/i })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/next player|winner|draw/i);
});
