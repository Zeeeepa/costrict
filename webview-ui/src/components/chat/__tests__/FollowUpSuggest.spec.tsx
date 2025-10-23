import React, { createContext, useContext } from "react"
import { render, screen } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"

import { FollowUpSuggest } from "../FollowUpSuggest"

// Mock the translation hook
vi.mock("@src/i18n/TranslationContext", () => ({
	TranslationProvider: ({ children }: { children: React.ReactNode }) => children,
	useAppTranslation: () => ({
		t: (key: string, options?: any) => {
			if (key === "chat:followUpSuggest.countdownDisplay" && options?.count !== undefined) {
				return `${options.count}s`
			}
			if (key === "chat:followUpSuggest.autoSelectCountdown" && options?.count !== undefined) {
				return `Auto-selecting in ${options.count} seconds`
			}
			if (key === "chat:followUpSuggest.copyToInput") {
				return "Copy to input"
			}
			return key
		},
	}),
}))

// Test-specific extension state context that only provides the values needed by FollowUpSuggest
interface TestExtensionState {
	autoApprovalEnabled: boolean
	alwaysAllowFollowupQuestions: boolean
	followupAutoApproveTimeoutMs: number
}

const TestExtensionStateContext = createContext<TestExtensionState | undefined>(undefined)

// Mock the useExtensionState hook to use our test context
vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => {
		const context = useContext(TestExtensionStateContext)
		if (!context) {
			throw new Error("useExtensionState must be used within TestExtensionStateProvider")
		}
		return context
	},
}))

// Test provider that only provides the specific values needed by FollowUpSuggest
const TestExtensionStateProvider: React.FC<{
	children: React.ReactNode
	value: TestExtensionState
}> = ({ children, value }) => {
	return <TestExtensionStateContext.Provider value={value}>{children}</TestExtensionStateContext.Provider>
}

// Helper function to render component with test providers
const renderWithTestProviders = (component: React.ReactElement, extensionState: TestExtensionState) => {
	return render(
		<TestExtensionStateProvider value={extensionState}>
			<TooltipProvider>{component}</TooltipProvider>
		</TestExtensionStateProvider>,
	)
}

describe("FollowUpSuggest", () => {
	const mockSuggestions = [{ answer: "First suggestion" }, { answer: "Second suggestion" }]

	const mockOnSuggestionClick = vi.fn()
	const mockOnCancelAutoApproval = vi.fn()

	// Default test state with auto-approval enabled
	const defaultTestState: TestExtensionState = {
		autoApprovalEnabled: true,
		alwaysAllowFollowupQuestions: true,
		followupAutoApproveTimeoutMs: 3000, // 3 seconds for testing
	}

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("should display countdown timer when countdown is provided", () => {
		renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
			/>,
			defaultTestState,
		)

		// Should show initial countdown (3 seconds)
		expect(screen.getByText(/3s/)).toBeInTheDocument()
	})

	it("should not display countdown timer when isAnswered is true", () => {
		renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
				isAnswered={true}
			/>,
			defaultTestState,
		)

		// Should not show countdown
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should not call onCancelAutoApproval when component unmounts (handled by parent)", () => {
		const { unmount } = renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
			/>,
			defaultTestState,
		)

		// Unmount the component
		unmount()

		// onCancelAutoApproval should NOT be called on unmount (parent handles this)
		expect(mockOnCancelAutoApproval).not.toHaveBeenCalled()
	})

	it("should not show countdown when countdown is 0", () => {
		renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={0}
			/>,
			defaultTestState,
		)

		// Should not show countdown
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should not show countdown when isAnswered is true even with countdown", () => {
		renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
				isAnswered={true}
			/>,
			defaultTestState,
		)

		// Should not show countdown
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should display custom countdown value", () => {
		renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={5}
			/>,
			defaultTestState,
		)

		// Should show initial countdown (5 seconds)
		expect(screen.getByText(/5s/)).toBeInTheDocument()
	})

	it("should render suggestions without countdown when countdown is 0", () => {
		renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={0}
			/>,
			defaultTestState,
		)

		// Should render suggestions
		expect(screen.getByText("First suggestion")).toBeInTheDocument()
		expect(screen.getByText("Second suggestion")).toBeInTheDocument()

		// Should not show countdown
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should not render when no suggestions are provided", () => {
		const { container } = renderWithTestProviders(
			<FollowUpSuggest
				suggestions={[]}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
			/>,
			defaultTestState,
		)

		// Component should not render anything
		expect(container.firstChild).toBeNull()
	})

	it("should not render when onSuggestionClick is not provided", () => {
		const { container } = renderWithTestProviders(
			<FollowUpSuggest suggestions={mockSuggestions} ts={123} onCancelAutoApproval={mockOnCancelAutoApproval} />,
			defaultTestState,
		)

		// Component should not render anything
		expect(container.firstChild).toBeNull()
	})

	it("should hide countdown when isAnswered becomes true", () => {
		const { rerender } = renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
				isAnswered={false}
			/>,
			defaultTestState,
		)

		// Initially should show countdown
		expect(screen.getByText(/3s/)).toBeInTheDocument()

		// Simulate user manually responding by setting isAnswered to true
		rerender(
			<TestExtensionStateProvider value={defaultTestState}>
				<TooltipProvider>
					<FollowUpSuggest
						suggestions={mockSuggestions}
						onSuggestionClick={mockOnSuggestionClick}
						ts={123}
						onCancelAutoApproval={mockOnCancelAutoApproval}
						countdown={3}
						isAnswered={true}
					/>
				</TooltipProvider>
			</TestExtensionStateProvider>,
		)

		// Countdown should no longer be visible immediately after isAnswered becomes true
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should hide countdown immediately when isAnswered changes from false to true", () => {
		const { rerender } = renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
				isAnswered={false}
			/>,
			defaultTestState,
		)

		// Initially should show countdown
		expect(screen.getByText(/3s/)).toBeInTheDocument()

		// User manually responds
		rerender(
			<TestExtensionStateProvider value={defaultTestState}>
				<TooltipProvider>
					<FollowUpSuggest
						suggestions={mockSuggestions}
						onSuggestionClick={mockOnSuggestionClick}
						ts={123}
						onCancelAutoApproval={mockOnCancelAutoApproval}
						countdown={3}
						isAnswered={true}
					/>
				</TooltipProvider>
			</TestExtensionStateProvider>,
		)

		// Countdown should be hidden immediately
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should display different countdown values correctly", () => {
		const { rerender } = renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
				isAnswered={false}
			/>,
			defaultTestState,
		)

		// Initially should show 3s
		expect(screen.getByText(/3s/)).toBeInTheDocument()

		// Change countdown to 2s
		rerender(
			<TestExtensionStateProvider value={defaultTestState}>
				<TooltipProvider>
					<FollowUpSuggest
						suggestions={mockSuggestions}
						onSuggestionClick={mockOnSuggestionClick}
						ts={123}
						onCancelAutoApproval={mockOnCancelAutoApproval}
						countdown={2}
						isAnswered={false}
					/>
				</TooltipProvider>
			</TestExtensionStateProvider>,
		)

		// Check countdown updated to 2s
		expect(screen.getByText(/2s/)).toBeInTheDocument()

		// Change countdown to 1s
		rerender(
			<TestExtensionStateProvider value={defaultTestState}>
				<TooltipProvider>
					<FollowUpSuggest
						suggestions={mockSuggestions}
						onSuggestionClick={mockOnSuggestionClick}
						ts={123}
						onCancelAutoApproval={mockOnCancelAutoApproval}
						countdown={1}
						isAnswered={false}
					/>
				</TooltipProvider>
			</TestExtensionStateProvider>,
		)

		// Check countdown updated to 1s
		expect(screen.getByText(/1s/)).toBeInTheDocument()

		// Change countdown to 0
		rerender(
			<TestExtensionStateProvider value={defaultTestState}>
				<TooltipProvider>
					<FollowUpSuggest
						suggestions={mockSuggestions}
						onSuggestionClick={mockOnSuggestionClick}
						ts={123}
						onCancelAutoApproval={mockOnCancelAutoApproval}
						countdown={0}
						isAnswered={false}
					/>
				</TooltipProvider>
			</TestExtensionStateProvider>,
		)

		// Countdown should no longer be visible after reaching 0
		expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
	})

	it("should handle component unmounting during countdown", () => {
		const { unmount } = renderWithTestProviders(
			<FollowUpSuggest
				suggestions={mockSuggestions}
				onSuggestionClick={mockOnSuggestionClick}
				ts={123}
				onCancelAutoApproval={mockOnCancelAutoApproval}
				countdown={3}
				isAnswered={false}
			/>,
			defaultTestState,
		)

		// Initially should show countdown
		expect(screen.getByText(/3s/)).toBeInTheDocument()

		// Unmount component before countdown completes
		unmount()

		// onCancelAutoApproval should NOT be called on unmount (parent handles cleanup)
		expect(mockOnCancelAutoApproval).not.toHaveBeenCalled()
	})
})
